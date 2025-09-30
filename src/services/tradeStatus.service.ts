import { TradeProposal } from '../models/tradeProposal.model.js';
import { TradeProposalStatus } from '../models/tradeProposalStatus.model.js';
import { Shipment } from '../models/shipment.model.js';
import { Op } from 'sequelize';

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
      console.error(`Trade proposal with ID ${tradeProposalId} not found`);
      return { success: false, error: 'Trade proposal not found' };
    }

    console.log(`📋 Trade proposal found:`, {
      id: tradeProposal.id,
      trade_proposal_status_id: tradeProposal.trade_proposal_status_id,
      current_status_alias: (tradeProposal as any).tradeProposalStatus?.alias
    });

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

        // Check shipments for both parties with valid tracking IDs
        const shippedBySender = await Shipment.findOne({
          where: {
            trade_id: tradeProposalId,
            user_id: tradeProposal.trade_sent_by,
            [Op.and]: [
              { tracking_id: { [Op.ne]: null } },
              { tracking_id: { [Op.ne]: '' } }
            ]
          },
          attributes: ['id', 'tracking_id']
        });

        const shippedByReceiver = await Shipment.findOne({
          where: {
            trade_id: tradeProposalId,
            user_id: tradeProposal.trade_sent_to,
            [Op.and]: [
              { tracking_id: { [Op.ne]: null } },
              { tracking_id: { [Op.ne]: '' } }
            ]
          },
          attributes: ['id', 'tracking_id']
        });

        const bothTradersShipped = !!(shippedBySender?.tracking_id && shippedByReceiver?.tracking_id);
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
      console.log(`🔍 Looking for status with alias: ${statusAlias}`);
      const newStatus = await TradeProposalStatus.findOne({
        where: { alias: statusAlias },
        attributes: ['id']
      });

      console.log(`📋 Found status:`, newStatus);

      if (newStatus) {
        console.log(`🔄 Updating trade proposal ${tradeProposalId} with status ID: ${newStatus.id}`);
        console.log(`🔍 Trade proposal instance before update:`, {
          id: tradeProposal.id,
          isNewRecord: tradeProposal.isNewRecord,
          primaryKey: TradeProposal.primaryKeyAttribute,
          primaryKeyValue: tradeProposal.getDataValue('id')
        });
        
        // Use direct database update instead of instance update to avoid primary key issues
        const updateResult = await TradeProposal.update(
          { trade_proposal_status_id: newStatus.id },
          { where: { id: tradeProposalId } }
        );
        console.log(`✅ Status update completed:`, updateResult);
      } else {
        console.error(`❌ Status with alias '${statusAlias}' not found in database`);
      }
    } else {
      console.log(`⚠️ Status update flag is false for alias: ${statusAlias}`);
    }

    return { success: true };

  } catch (error: any) {
    console.error('Error setting trade proposal status:', error);
    return { success: false, error: error.message };
  }
};
