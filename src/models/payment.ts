export type PaymentItemInput = {
  id?: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
};

export type CreatePreferenceBody = {
  items?: PaymentItemInput[];
  payerEmail?: string;
  externalReference?: string;
};
