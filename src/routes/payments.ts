import { Router } from 'express';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { env } from '../config/env.js';

type PaymentItemInput = {
  id?: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;

};

export const paymentsRouter = Router();

function getMercadoPagoClient() {
  return new MercadoPagoConfig({ accessToken: env.mpAccessToken });

}

paymentsRouter.post('/payments/preference', async (req, res) => {
  if (!env.mpAccessToken) {
    return res.status(500).json({
      error: 'Mercado Pago is not configured. Define MP_ACCESS_TOKEN in environment.'
    
    });

  }

  const { items, payerEmail, externalReference } = req.body as {
    items?: PaymentItemInput[];
    payerEmail?: string;
    externalReference?: string;

  };

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'The "items" array is required.' });

  }

  const hasInvalidItem = items.some((item) => (
    typeof item.title !== 'string'
    || item.title.trim().length === 0
    || typeof item.quantity !== 'number'
    || item.quantity <= 0
    || typeof item.unit_price !== 'number'
    || item.unit_price <= 0

  ));

  if (hasInvalidItem) {
    return res.status(400).json({
      error: 'Each item must include valid title, quantity and unit_price values.'

    });

  }

  try {
    const client = getMercadoPagoClient();
    const preference = new Preference(client);
    const response = await preference.create({
      body: {
        items: items.map((item) => ({
          id: item.id ?? item.title.toLowerCase().replace(/\s+/g, '-'),
          title: item.title,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency_id: item.currency_id ?? 'BRL'
          
        })),
        payer: (payerEmail) ? { email: payerEmail } : undefined,
        external_reference: externalReference

      }

    });

    return res.status(201).json({
      id: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point

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
      return res.status(404).json({
        found: false,
        externalReference
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
