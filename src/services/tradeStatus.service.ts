import { TradeProposal } from '../models/tradeProposal.model.js';
import { TradeProposalStatus } from '../models/tradeProposalStatus.model.js';
import { Shipment } from '../models/shipment.model.js';

// Set trade proposal status (matches Laravel HelperTradeAndOfferStatus)
export const setTradeProposalStatus = async (tradeProposalId: number, statusAlias: string) => {
  try {
    const tradeProposal = await TradeProposal.findByPk(tradeProposalId, {
      include: [
        {
          model: TradeProposalStatus,
          as: 'tradeProposalStatus',
          attributes: ['id', 'alias', 'name']
        }
      ],
      attributes: [
        'trade_sent_to',
        'trade_sent_by',
        'trade_proposal_status_id',
        'trade_sender_confrimation',
        'receiver_confirmation'
      ]
    });

    if (!tradeProposal) {
      return { success: false, error: 'Trade proposal not found' };
    }

    let statusUpdateFlag = false;

    // Determine if status should be updated based on current state
    switch (statusAlias) {
      case 'trade-sent':
      case 'trade-offer-updated':
      case 'trade-cancelled':
      case 'trade-accepted':
      case 'both-traders-shipped':
      case 'both-marked-trade-completed':
      case 'counter-trade-offer':
      case 'counter-offer-accepted':
      case 'payment-made':
      case 'payment-confirmed':
      case 'trade-offer-accepted-receiver-pay':
      case 'trade-offer-accepted-sender-pay':
      case 'counter-offer-accepted-receiver-pay':
      case 'counter-offer-accepted-sender-pay':
        statusUpdateFlag = true;
        break;

      case 'marked-trade-completed-by-sender':
      case 'marked-trade-completed-by-receiver':
        statusUpdateFlag = true;
        if (tradeProposal.trade_sender_confrimation === '1' && tradeProposal.receiver_confirmation === '1') {
          await setTradeProposalStatus(tradeProposalId, 'both-marked-trade-completed');
        }
        break;

      case 'shipped-by-receiver':
      case 'shipped-by-sender':
        statusUpdateFlag = true;

        const shippedBySender = await Shipment.findOne({
          where: { 
            trade_id: tradeProposalId, 
            user_id: tradeProposal.trade_sent_by 
          },
          attributes: ['id', 'tracking_id']
        });

        const shippedByReceiver = await Shipment.findOne({
          where: { 
            trade_id: tradeProposalId, 
            user_id: tradeProposal.trade_sent_to 
          },
          attributes: ['id', 'tracking_id']
        });

        const bothTradersShipped = shippedBySender?.tracking_id && shippedByReceiver?.tracking_id;
        if (bothTradersShipped) {
          await setTradeProposalStatus(tradeProposalId, 'both-traders-shipped');
        }
        break;

      case 'trade-viewed':
        if ((tradeProposal as any).tradeProposalStatus?.alias === 'trade-sent') {
          statusUpdateFlag = true;
        }
        break;

      case 'counter-offer-viewed':
        if ((tradeProposal as any).tradeProposalStatus?.alias === 'counter-trade-offer') {
          statusUpdateFlag = true;
        }
        break;
    }

    if (statusUpdateFlag) {
      const newStatus = await TradeProposalStatus.findOne({
        where: { alias: statusAlias },
        attributes: ['id']
      });

      if (newStatus) {
        await tradeProposal.update({
          trade_proposal_status_id: newStatus.id
        });
      }
    }

    return { success: true };

  } catch (error: any) {
    console.error('Error setting trade proposal status:', error);
    return { success: false, error: error.message };
  }
};
