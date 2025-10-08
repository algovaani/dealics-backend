import { NotificationTemplate, TradeNotification } from '../models/index.js';

type NotificationSetFor = 'Trade' | 'Offer' | 'Shipping' | 'Payment' | 'Default';

const NotificationContext = {
  sender_alias: '',
  receiver_alias: '',
  sender_trade_status: '',
  receiver_trade_status: ''
};

export const setNotificationContext = (ctx: Partial<typeof NotificationContext>) => {
  if (typeof ctx.sender_alias === 'string') NotificationContext.sender_alias = ctx.sender_alias;
  if (typeof ctx.receiver_alias === 'string') NotificationContext.receiver_alias = ctx.receiver_alias;
  if (typeof ctx.sender_trade_status === 'string') NotificationContext.sender_trade_status = ctx.sender_trade_status;
  if (typeof ctx.receiver_trade_status === 'string') NotificationContext.receiver_trade_status = ctx.receiver_trade_status;
};

const synthesizeText = (message?: string | null): string => {
  if (!message) return '';
  let out = message;
  if (NotificationContext.sender_alias) out = out.replace(/\{\{sender_alias\}\}/g, NotificationContext.sender_alias);
  if (NotificationContext.receiver_alias) out = out.replace(/\{\{receiver_alias\}\}/g, NotificationContext.receiver_alias);
  if (NotificationContext.sender_trade_status) out = out.replace(/\{\{sender_trade_status\}\}/g, NotificationContext.sender_trade_status);
  if (NotificationContext.receiver_trade_status) out = out.replace(/\{\{receiver_trade_status\}\}/g, NotificationContext.receiver_trade_status);
  return out;
};

export const setTradersNotificationOnVariousActionBasis = async (
  act: string,
  sentBy: number,
  sentTo: number,
  dataSetId: number,
  setFor: NotificationSetFor
) => {
  try {
    const tpl = await NotificationTemplate.findOne({ where: { alias: act, set_for: setFor as any } });

    if (tpl && (tpl.to_sender || tpl.to_receiver)) {
      const senderMsg = synthesizeText(tpl.to_sender);
      if (senderMsg && senderMsg.trim() !== '') {
        const senderCollection: any = {
          notification_sent_by: sentTo,
          notification_sent_to: sentBy,
          message: senderMsg,
          created_at: new Date(),
          updated_at: new Date()
        };
        if (setFor === 'Trade') senderCollection.trade_proposal_id = dataSetId;
        else if (setFor === 'Offer') senderCollection.buy_sell_card_id = dataSetId;
        await TradeNotification.create(senderCollection);
      }

      const receiverMsg = synthesizeText(tpl.to_receiver);
      if (receiverMsg && receiverMsg.trim() !== '') {
        const receiverCollection: any = {
          notification_sent_by: sentBy,
          notification_sent_to: sentTo,
          message: receiverMsg,
          created_at: new Date(),
          updated_at: new Date()
        };
        if (setFor === 'Trade') receiverCollection.trade_proposal_id = dataSetId;
        else if (setFor === 'Offer') receiverCollection.buy_sell_card_id = dataSetId;
        await TradeNotification.create(receiverCollection);
      }
    }
  } catch (error) {
    console.error('Error creating notifications:', error);
  }
};


