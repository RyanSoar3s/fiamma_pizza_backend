export type OrderItemInput = {
  productId: number;
  quantity: number;
};

export type PreferenceItem = {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: string;
};

export type CreatePreferenceBody = {
  items?: OrderItemInput[];
  payerEmail?: string;
  externalReference?: string;
};
