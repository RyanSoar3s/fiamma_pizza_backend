import { Router } from 'express';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { env } from '../config/env.js';
import { pool } from '../database/pool.js';
import { CreatePreferenceBody, PreferenceItem } from '../models/payment.js';

export const paymentsRouter = Router();

const ORDER_FEE_ITEM = {
  id: 'order-fee',
  title: 'Taxa de serviço',
  quantity: 1,
  unit_price: 7,
  currency_id: 'BRL'
};

function getItemsValidationError(items: CreatePreferenceBody['items']) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'The "items" array is required.';

  }

  const hasInvalidItem = items.some((item) => (
    typeof item.productId !== 'number'
    || !Number.isInteger(item.productId)
    || item.productId <= 0
    || typeof item.quantity !== 'number'
    || !Number.isInteger(item.quantity)
    || item.quantity <= 0

  ));

  if (hasInvalidItem) {
    return 'Each item must include valid productId and quantity values.';

  }

  return null;
}

async function getOrderSummary(items: NonNullable<CreatePreferenceBody['items']>) {
  const quantitiesByProductId = items.reduce<Map<number, number>>((acc, item) => {
    acc.set(item.productId, (acc.get(item.productId) ?? 0) + item.quantity);
    return acc;
  }, new Map());
  const productIds = [...quantitiesByProductId.keys()];
  const productsResult = await pool.query(
    `
    SELECT id, name, price
    FROM products
    WHERE id = ANY($1::int[])
    `,
    [productIds],
  );
  const productsById = new Map(productsResult.rows.map((row) => [Number(row.id), row]));
  const missingProductIds = productIds.filter((productId) => !productsById.has(productId));

  if (missingProductIds.length > 0) {
    return {
      error: `Products not found: ${missingProductIds.join(', ')}`
    };

  }

  const orderItems: PreferenceItem[] = productIds.map((productId) => {
    const product = productsById.get(productId);

    return {
      id: String(productId),
      title: product.name,
      quantity: quantitiesByProductId.get(productId) ?? 0,
      unit_price: Number(product.price),
      currency_id: 'BRL'
    };
  });
  const subtotal = orderItems.reduce((total, item) => (
    total + (item.quantity * item.unit_price)
  ), 0);
  const feeAmount = ORDER_FEE_ITEM.quantity * ORDER_FEE_ITEM.unit_price;

  return {
    items: orderItems,
    fee: ORDER_FEE_ITEM,
    subtotal,
    total: subtotal + feeAmount,
    currencyId: ORDER_FEE_ITEM.currency_id
  };
}

function getMercadoPagoClient() {
  return new MercadoPagoConfig({ accessToken: env.mpAccessToken });

}

paymentsRouter.get('/orders', async (_req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        external_reference,
        payer_email,
        items,
        status,
        payment_id,
        created_at,
        updated_at
      FROM orders
      ORDER BY created_at DESC
      `,
    );

    return res.status(200).json({
      count: result.rows.length,
      orders: result.rows.map((row) => ({
        externalReference: row.external_reference,
        payerEmail: row.payer_email,
        items: row.items,
        status: row.status,
        paymentId: row.payment_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    });
  } catch (error) {
    console.error('Orders list query error:', error);
    return res.status(500).json({ error: 'Failed to list stored orders.' });
  }
});

paymentsRouter.post('/payments/summary', async (req, res) => {
  const { items } = req.body as CreatePreferenceBody;
  const validationError = getItemsValidationError(items);

  if (validationError) {
    return res.status(400).json({ error: validationError });

  }

  try {
    const orderSummary = await getOrderSummary(items as NonNullable<CreatePreferenceBody['items']>);

    if ('error' in orderSummary) {
      return res.status(404).json({ error: orderSummary.error });

    }

    return res.status(200).json(orderSummary);
  } catch (error) {
    console.error('Payment summary error:', error);
    return res.status(500).json({ error: 'Failed to calculate payment summary.' });

  }
});

paymentsRouter.post('/payments/preference', async (req, res) => {
  if (!env.mpAccessToken) {
    return res.status(500).json({
      error: 'Mercado Pago is not configured. Define MP_ACCESS_TOKEN in environment.'
    
    });

  }

  const { items, payerEmail, externalReference } = req.body as CreatePreferenceBody;
  const validationError = getItemsValidationError(items);

  if (validationError) {
    return res.status(400).json({ error: validationError });

  }

  try {
    const client = getMercadoPagoClient();
    const preference = new Preference(client);
    const orderReference = externalReference || `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const orderSummary = await getOrderSummary(items as NonNullable<CreatePreferenceBody['items']>);

    if ('error' in orderSummary) {
      return res.status(404).json({ error: orderSummary.error });

    }

    const preferenceItems = [...orderSummary.items, orderSummary.fee];

    await pool.query(
      `
      INSERT INTO orders (external_reference, payer_email, items, status)
      VALUES ($1, $2, $3::jsonb, 'pending')
      ON CONFLICT (external_reference)
      DO UPDATE SET
        payer_email = EXCLUDED.payer_email,
        items = EXCLUDED.items,
        updated_at = NOW()
      `,
      [orderReference, payerEmail ?? null, JSON.stringify(preferenceItems)],
    );

    const response = await preference.create({
      body: {
        items: preferenceItems,
        payer: (payerEmail) ? { email: payerEmail } : undefined,
        external_reference: orderReference,
        notification_url: env.mpWebhookUrl || undefined

      }

    });

    return res.status(201).json({
      id: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
      externalReference: orderReference

    });

  } catch (error) {
    console.error('Mercado Pago preference error:', error);
    return res.status(500).json({ error: 'Failed to create Mercado Pago preference.' });

  }

});

paymentsRouter.post('/payments/webhook', async (req, res) => {
  if (!env.mpAccessToken) {
    return res.status(500).json({
      error: 'Mercado Pago is not configured. Define MP_ACCESS_TOKEN in environment.'

    });

  }

  const bodyData = req.body?.data;
  const notificationType = String(req.body?.type ?? req.query.type ?? req.query.topic ?? '');
  const dataId = String(bodyData?.id ?? req.body?.id ?? req.query['data.id'] ?? req.query.id ?? '');

  // Acknowledge unknown payloads to avoid endless retry loops from provider.
  if (!dataId || !notificationType) {
    return res.status(200).json({ received: true, ignored: true });

  }

  if (notificationType !== 'payment') {
    return res.status(200).json({ received: true, ignored: true, type: notificationType });

  }

  try {
    const client = getMercadoPagoClient();
    const payment = new Payment(client);
    const paymentInfo = await payment.get({ id: dataId });

    // Place order update logic here (database status update, notifications, etc).
    console.log('Mercado Pago webhook payment received:', {
      id: paymentInfo.id,
      status: paymentInfo.status,
      externalReference: paymentInfo.external_reference

    });

    if (paymentInfo.external_reference) {
      await pool.query(
        `
        UPDATE orders
        SET
          status = $2,
          payment_id = $3,
          payment_payload = $4::jsonb,
          updated_at = NOW()
        WHERE external_reference = $1
        `,
        [
          paymentInfo.external_reference,
          paymentInfo.status ?? 'unknown',
          paymentInfo.id ? String(paymentInfo.id) : null,
          JSON.stringify(paymentInfo),
        ],
      );
    }

    return res.status(200).json({
      received: true,
      paymentId: paymentInfo.id,
      status: paymentInfo.status,
      externalReference: paymentInfo.external_reference

    });

  } catch (error) {
    console.error('Mercado Pago webhook error:', error);
    return res.status(500).json({ error: 'Failed to process Mercado Pago webhook.' });

  }

});

paymentsRouter.get('/payments/status/:externalReference', async (req, res) => {
  if (!env.mpAccessToken) {
    return res.status(500).json({
      error: 'Mercado Pago is not configured. Define MP_ACCESS_TOKEN in environment.'

    });

  }

  const { externalReference } = req.params;

  if (!externalReference) {
    return res.status(400).json({ error: 'externalReference is required.' });

  }

  try {
    const client = getMercadoPagoClient();
    const payment = new Payment(client);
    const result = await payment.search({
      options: {
        external_reference: externalReference,
        sort: 'date_created',
        criteria: 'desc',
        limit: 1

      }

    });

    const latestPayment = result.results?.[0];

    if (!latestPayment) {
      const orderResult = await pool.query(
        `
        SELECT
          external_reference,
          status,
          payment_id,
          created_at,
          updated_at
        FROM orders
        WHERE external_reference = $1
        LIMIT 1
        `,
        [externalReference],
      );

      const storedOrder = orderResult.rows[0];

      if (!storedOrder) {
        return res.status(404).json({
          found: false,
          externalReference
        });
      }

      return res.status(200).json({
        found: true,
        externalReference,
        payment: null,
        storedOrder: {
          status: storedOrder.status,
          paymentId: storedOrder.payment_id,
          createdAt: storedOrder.created_at,
          updatedAt: storedOrder.updated_at
        }
      });
    }

    return res.status(200).json({
      found: true,
      externalReference,
      payment: {
        id: latestPayment.id,
        status: latestPayment.status,
        statusDetail: latestPayment.status_detail,
        transactionAmount: latestPayment.transaction_amount,
        dateCreated: latestPayment.date_created,
        dateApproved: latestPayment.date_approved
      }
    });
  } catch (error) {
    console.error('Mercado Pago status query error:', error);
    return res.status(500).json({ error: 'Failed to query payment status.' });

  }
  
});
