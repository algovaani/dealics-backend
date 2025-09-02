# Standardized API Response Format

All APIs in this project now return responses in the following standardized format:

```json
{
  "status": true/false,
  "message": "Success or error message",
  "data": []
}
```

## Response Format Details

- **status**: `boolean` - Indicates if the request was successful
- **message**: `string` - Human-readable message describing the result
- **data**: `array` - Contains the response data (empty array if no data)

## Updated Controllers

### 1. Authentication Controller (`src/controllers/auth.controller.ts`)

#### Login
```
POST /api/auth/login
```
**Response:**
```json
{
  "status": true,
  "message": "Login successful",
  "data": [{"token": "jwt_token", "user": {...}}]
}
```

#### Register
```
POST /api/auth/register
```
**Response:**
```json
{
  "status": true,
  "message": "Registration successful",
  "data": [{"token": "jwt_token", "user": {...}}]
}
```

### 2. User Controller (`src/controllers/user.controller.ts`)

#### Get All Users
```
GET /api/users
```
**Response:**
```json
{
  "status": true,
  "message": "Users retrieved successfully",
  "data": [/* array of users */]
}
```

#### Get User by ID
```
GET /api/users/:id
```
**Response:**
```json
{
  "status": true,
  "message": "User retrieved successfully",
  "data": [/* user object */]
}
```

#### Create User
```
POST /api/users
```
**Response:**
```json
{
  "status": true,
  "message": "User created successfully",
  "data": [/* created user */]
}
```

#### Update User
```
PUT /api/users/:id
```
**Response:**
```json
{
  "status": true,
  "message": "User updated successfully",
  "data": [/* updated user */]
}
```

#### Delete User
```
DELETE /api/users/:id
```
**Response:**
```json
{
  "status": true,
  "message": "User deleted successfully",
  "data": []
}
```

### 3. Categories Controller (`src/controllers/categories.controller.ts`)

#### Get All Categories
```
GET /api/categories
```
**Response:**
```json
{
  "status": true,
  "message": "Categories retrieved successfully",
  "data": [/* array of categories */]
}
```

#### Get Category by ID
```
GET /api/categories/:id
```
**Response:**
```json
{
  "status": true,
  "message": "Category retrieved successfully",
  "data": [/* category object */]
}
```

#### Update Category
```
PUT /api/categories/:id
```
**Response:**
```json
{
  "status": true,
  "message": "Category updated successfully",
  "data": [/* updated category */]
}
```

### 4. Trading Card Controller (`src/controllers/tradingcard.controller.ts`)

#### Get Trading Cards by Category
```
GET /api/tradingcards/category/:categoryName
```
**Response:**
```json
{
  "status": true,
  "message": "Trading cards retrieved successfully",
  "data": [/* array of trading cards */]
}
```

#### Get All Trading Cards
```
GET /api/tradingcards
```
**Response:**
```json
{
  "status": true,
  "message": "Trading cards retrieved successfully",
  "data": [/* array of trading cards */]
}
```

#### Get Trading Card by ID
```
GET /api/tradingcards/:id
```
**Response:**
```json
{
  "status": true,
  "message": "Trading card retrieved successfully",
  "data": [/* trading card object */]
}
```

#### Delete Trading Card
```
DELETE /api/tradingcards/:id
```
**Response:**
```json
{
  "status": true,
  "message": "Trading Card deleted successfully",
  "data": []
}
```

#### Get My Trading Cards by Category
```
GET /user/tradingcards/my-products/:categoryName
```
**Response:**
```json
{
  "status": true,
  "message": "My trading cards retrieved successfully",
  "data": [{
    "tradingcards": [...],
    "pagination": {...},
    "StagFilterForAllCategory": true,
    "MyCards": true,
    "stagDatas": [...],
    "stag_url_trader": "my-products/"
  }]
}
```

#### Get Form Fields by Category
```
GET /user/tradingcards/form-fields/:categorySlug
```
**Response:**
```json
{
  "status": true,
  "message": "Form fields retrieved successfully",
  "data": [/* form fields object */]
}
```

#### Get All Card Conditions
```
GET /api/tradingCards/card-conditions
```
**Response:**
```json
{
  "status": true,
  "message": "Card conditions retrieved successfully",
  "data": [/* array of card conditions */]
}
```

#### Get Card Condition by ID
```
GET /api/tradingCards/card-conditions/:id
```
**Response:**
```json
{
  "status": true,
  "message": "Card condition retrieved successfully",
  "data": [/* card condition object */]
}
```

#### Save Trading Card
```
POST /api/user/tradingcards/save/:categoryId
```
**Response:**
```json
{
  "status": true,
  "message": "Trading card saved successfully",
  "data": [/* saved trading card data */]
}
```

#### Update Trading Card
```
PATCH /api/user/tradingcards/:cardId
```
**Response:**
```json
{
  "status": true,
  "message": "Trading card updated successfully",
  "data": [/* updated trading card data */]
}
```

### 5. Slider Controller (`src/controllers/slider.controller.ts`)

#### Get Active Sliders
```
GET /api/sliders/active
```
**Response:**
```json
{
  "status": true,
  "message": "Active sliders retrieved successfully",
  "data": [/* array of active sliders */]
}
```

### 6. Trading Card Fields Controller (`src/controllers/tradingcardfields.controller.ts`)

#### Get Trading Card Fields
```
GET /api/tradingcard-fields
```
**Response:**
```json
{
  "status": true,
  "message": "Trading card fields retrieved successfully",
  "data": [{"fields": [...]}]
}
```

### 7. Category Fields Controller (`src/controllers/categoryfields.controller.ts`)

#### Get Category Fields
```
GET /api/category-fields
```
**Response:**
```json
{
  "status": true,
  "message": "Category fields retrieved successfully",
  "data": [/* array of category fields */]
}
```

### 8. Email Controller (`src/controllers/email.controller.ts`)

#### Send Email
```
POST /api/email/send
```
**Response:**
```json
{
  "status": true,
  "message": "Email sent successfully",
  "data": []
}
```

#### Send Welcome Onboarding Email
```
POST /api/email/welcome-onboarding
```
**Response:**
```json
{
  "status": true,
  "message": "Welcome onboarding email sent successfully",
  "data": []
}
```

#### Get Email Template
```
GET /api/email/template/:alias
```
**Response:**
```json
{
  "status": true,
  "message": "Email template retrieved successfully",
  "data": [/* template object */]
}
```

#### Create/Update Email Template
```
POST /api/email/template
```
**Response:**
```json
{
  "status": true,
  "message": "Email template saved successfully",
  "data": [/* template object */]
}
```

#### Get All Email Templates
```
GET /api/email/templates
```
**Response:**
```json
{
  "status": true,
  "message": "Email templates retrieved successfully",
  "data": [/* array of templates */]
}
```

#### Delete Email Template
```
DELETE /api/email/template/:id
```
**Response:**
```json
{
  "status": true,
  "message": "Email template deleted successfully",
  "data": []
}
```

#### Process Mail Queue
```
POST /api/email/process-queue
```
**Response:**
```json
{
  "status": true,
  "message": "Mail queue processed successfully",
  "data": []
}
```

#### Get Mail Queue Status
```
GET /api/email/queue-status
```
**Response:**
```json
{
  "status": true,
  "message": "Mail queue status retrieved successfully",
  "data": [{"totalPending": 0, "totalProcessed": 0}]
}
```

#### Send Unified Email
```
POST /api/email/send-unified
```
**Response:**
```json
{
  "status": true,
  "message": "Verification email sent successfully",
  "data": []
}
```

#### Send Email Verification
```
POST /api/email/send-verification
```
**Response:**
```json
{
  "status": true,
  "message": "Please enter your email address",
  "data": []
}
```

#### Test Email Configuration
```
POST /api/email/test-config
```
**Response:**
```json
{
  "status": true,
  "message": "Email configuration is valid",
  "data": []
}
```

#### Update Mail Settings
```
PUT /api/email/settings
```
**Response:**
```json
{
  "status": true,
  "message": "Mail settings updated successfully",
  "data": [{"mail_sent": 1}]
}
```

## Error Response Examples

### 400 Bad Request
```json
{
  "status": false,
  "message": "Email and password are required",
  "data": []
}
```

### 401 Unauthorized
```json
{
  "status": false,
  "message": "Unauthorized",
  "data": []
}
```

### 403 Forbidden
```json
{
  "status": false,
  "message": "Token expired",
  "data": []
}
```

### 404 Not Found
```json
{
  "status": false,
  "message": "User not found",
  "data": []
}
```

### 500 Internal Server Error
```json
{
  "status": false,
  "message": "Internal server error",
  "data": []
}
```

## Middleware Updates

### Auth Middleware (`src/middlewares/auth.middleware.ts`)
- Updated to use standardized response format for authentication errors

### Admin Middleware (`src/middlewares/admin.middleware.ts`)
- Updated to use standardized response format for authorization errors

## Implementation Notes

1. **Consistent Format**: All API responses now follow the same structure
2. **Error Handling**: All controllers include proper try-catch blocks with standardized error responses
3. **Data Arrays**: All data is wrapped in arrays, even single objects
4. **Empty Arrays**: When no data is returned, an empty array is used instead of null/undefined
5. **Helper Function**: Each controller includes a `sendApiResponse` helper function for consistency

## Benefits

- **Consistency**: All APIs return the same response structure
- **Predictability**: Frontend developers know exactly what to expect
- **Error Handling**: Standardized error responses make debugging easier
- **Maintainability**: Easier to maintain and update response formats
- **Documentation**: Clear structure makes API documentation more accurate
