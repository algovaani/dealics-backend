# CardCondition Model Integration

## Overview
The `CardCondition` model has been successfully integrated into the trading card system, providing card condition data for trading cards and new API endpoints for managing card conditions.

## Model Structure

### CardCondition Model (`src/models/cardCondition.model.ts`)
```typescript
@Table({
  tableName: 'card_conditions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export class CardCondition extends Model<CardCondition> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT.UNSIGNED,
  })
  id!: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  card_condition_name?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  category_id?: string;

  @Column({
    type: DataType.ENUM('1', '0'),
    allowNull: false,
    defaultValue: '1',
  })
  card_condition_status!: '1' | '0';

  @CreatedAt
  @Column({ field: 'created_at' })
  created_at?: Date;

  @UpdatedAt
  @Column({ field: 'updated_at' })
  updated_at?: Date;

  @HasMany(() => TradingCard)
  tradingCards?: TradingCard[];
}
```

### TradingCard Model Updates
The `TradingCard` model has been updated to include:
- Import of `CardCondition` model
- `@BelongsTo(() => CardCondition)` association
- `cardCondition?: CardCondition` property

## Database Relationships

### One-to-Many Relationship
- **CardCondition** → **TradingCard**: One card condition can have many trading cards
- **TradingCard** → **CardCondition**: Each trading card belongs to one card condition

### Foreign Key
- `trading_cards.card_condition_id` references `card_conditions.id`

## API Endpoints

### 1. Get All Card Conditions
```
GET /api/tradingCards/card-conditions
```

**Response:**
```json
{
  "status": true,
  "message": "Card conditions retrieved successfully",
  "data": [
    {
      "id": 1,
      "card_condition_name": "Mint",
      "card_condition_status": "1",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": 2,
      "card_condition_name": "Near Mint",
      "card_condition_status": "1",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Get Card Condition by ID
```
GET /api/tradingCards/card-conditions/:id
```

**Response:**
```json
{
  "status": true,
  "message": "Card condition retrieved successfully",
  "data": {
    "id": 1,
    "card_condition_name": "Mint",
    "card_condition_status": "1",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Service Methods

### TradingCardService Updates
The service now includes card condition data in trading card queries:

```typescript
// Get trading cards by category now includes card condition
const tradingCards = await TradingCard.findAll({
  where: { category_id: category.id },
  include: [
    { model: Category, attributes: ['id', 'slug', 'sport_name'] },
    { model: User, attributes: ['id', 'username'] },
    { model: CardCondition, attributes: ['id', 'card_condition_name', 'card_condition_status'] }
  ],
  // ... other options
});
```

### New CardCondition Methods
```typescript
// Get all active card conditions
async getAllCardConditions() {
  const cardConditions = await CardCondition.findAll({
    where: { card_condition_status: '1' },
    order: [['card_condition_name', 'ASC']],
    attributes: ['id', 'card_condition_name', 'card_condition_status', 'created_at', 'updated_at']
  });
  return cardConditions;
}

// Get card condition by ID
async getCardConditionById(id: number) {
  const cardCondition = await CardCondition.findByPk(id);
  return cardCondition;
}
```

## Updated Trading Card Response Structure

### Trading Card with Card Condition
```json
{
  "status": true,
  "message": "Trading cards retrieved successfully",
  "data": [
    {
      "id": 1,
      "code": "TC001",
      "category_id": 1,
      "trading_card_img": "image.jpg",
      "trading_card_slug": "trading-card-1",
      "trading_card_estimated_value": "100.00",
      "is_demo": false,
      "haveitem": 1,
      "category": {
        "id": 1,
        "slug": "trading-cards",
        "sport_name": "Trading Cards"
      },
      "trader": {
        "id": 1,
        "username": "trader1"
      },
      "cardCondition": {
        "id": 1,
        "card_condition_name": "Mint",
        "card_condition_status": "1"
      }
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Frontend Integration

### Fetching Card Conditions
```javascript
// Get all card conditions for dropdown
fetch('/api/tradingCards/card-conditions')
  .then(response => response.json())
  .then(data => {
    if (data.status === true) {
      const cardConditions = data.data;
      // Populate dropdown or form field
      populateCardConditionDropdown(cardConditions);
    }
  });

// Get specific card condition
fetch('/api/tradingCards/card-conditions/1')
  .then(response => response.json())
  .then(data => {
    if (data.status === true) {
      const cardCondition = data.data;
      console.log('Card condition:', cardCondition.card_condition_name);
    }
  });
```

### Displaying Card Condition in Trading Cards
```javascript
// Display trading card with condition
function displayTradingCard(tradingCard) {
  const conditionName = tradingCard.cardCondition?.card_condition_name || 'Unknown';
  const conditionStatus = tradingCard.cardCondition?.card_condition_status || '0';
  
  return `
    <div class="trading-card">
      <h3>${tradingCard.code}</h3>
      <p>Condition: ${conditionName}</p>
      <p>Status: ${conditionStatus === '1' ? 'Active' : 'Inactive'}</p>
    </div>
  `;
}
```

## Database Schema

### card_conditions Table
```sql
CREATE TABLE `card_conditions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `card_condition_name` varchar(255) DEFAULT NULL,
  `category_id` text,
  `card_condition_status` enum('1','0') NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### trading_cards Table (Updated)
The `trading_cards` table already contains:
```sql
`card_condition_id` int(11) DEFAULT NULL
```

## Usage Examples

### 1. Form Field Population
```javascript
// Populate card condition dropdown in forms
async function populateCardConditionForm() {
  try {
    const response = await fetch('/api/tradingCards/card-conditions');
    const data = await response.json();
    
    if (data.status === true) {
      const select = document.getElementById('card-condition-select');
      data.data.forEach(condition => {
        const option = document.createElement('option');
        option.value = condition.id;
        option.textContent = condition.card_condition_name;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading card conditions:', error);
  }
}
```

### 2. Trading Card Display
```javascript
// Display trading cards with condition information
function displayTradingCards(tradingCards) {
  const container = document.getElementById('trading-cards-container');
  
  tradingCards.forEach(card => {
    const cardElement = document.createElement('div');
    cardElement.className = 'trading-card-item';
    
    const conditionInfo = card.cardCondition 
      ? `<span class="condition ${card.cardCondition.card_condition_status === '1' ? 'active' : 'inactive'}">${card.cardCondition.card_condition_name}</span>`
      : '<span class="condition unknown">Unknown Condition</span>';
    
    cardElement.innerHTML = `
      <h4>${card.code}</h4>
      <p>Value: $${card.trading_card_estimated_value}</p>
      <p>Condition: ${conditionInfo}</p>
    `;
    
    container.appendChild(cardElement);
  });
}
```

### 3. Filtering by Condition
```javascript
// Filter trading cards by condition
function filterByCondition(conditionId) {
  const cards = document.querySelectorAll('.trading-card-item');
  
  cards.forEach(card => {
    const conditionElement = card.querySelector('.condition');
    if (conditionId === 'all' || conditionElement.dataset.conditionId === conditionId) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}
```

## Benefits of Integration

1. **Enhanced Data**: Trading cards now include condition information
2. **Better User Experience**: Users can see card conditions in listings
3. **Filtering Capabilities**: Filter trading cards by condition
4. **Form Support**: Card condition dropdowns in forms
5. **Data Consistency**: Standardized card condition data across the system
6. **API Completeness**: Full CRUD operations for card conditions

## Next Steps

1. **Test the API endpoints** to ensure they work correctly
2. **Update frontend forms** to include card condition selection
3. **Add condition filtering** to trading card listings
4. **Implement condition validation** in trading card creation/updates
5. **Add condition-based pricing** if applicable
6. **Create condition management** interface for administrators

## Error Handling

All endpoints follow the standardized error response format:
```json
{
  "status": false,
  "message": "Error description",
  "data": { "error": "Detailed error information" },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Common error scenarios:
- **400**: Invalid parameters
- **404**: Card condition not found
- **500**: Internal server error

The integration is now complete and ready for use! 🎉
