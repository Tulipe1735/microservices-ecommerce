const PAYME_MERCHANT_ID = process.env.PAYME_MERCHANT_ID as string;
const PAYME_MERCHANT_KEY = process.env.PAYME_MERCHANT_KEY as string;
const IS_TEST = process.env.NODE_ENV !== "production";

// 生成 Payme 支付跳转 URL
// amount 单位：UZS（函数内部自动转换为 tiyin）
export const createPaymeUrl = (orderId: string, amountUZS: number): string => {
  const params = {
    m: PAYME_MERCHANT_ID,
    ac: { order_id: orderId }, // account 字段，Payme 回调时原样返回
    a: amountUZS * 100, // tiyin（1 UZS = 100 tiyin）
    l: "ru", // 语言：ru | uz | en
  };

  const encoded = Buffer.from(JSON.stringify(params)).toString("base64");
  const baseUrl = IS_TEST
    ? "https://test.paycom.uz"
    : "https://checkout.paycom.uz";

  return `${baseUrl}/${encoded}`;
};

// 验证 Payme 回调的 Basic Auth
// Payme 用 Basic merchantId:merchantKey 的 base64 鉴权
export const verifyPaymeCallback = (
  login: string,
  password: string,
): boolean => {
  return login === PAYME_MERCHANT_ID && password === PAYME_MERCHANT_KEY;
};
