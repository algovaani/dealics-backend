# Standardized API Response Format

## Overview
All API endpoints now return a consistent response format with status codes, status flags (true/false), and standardized structure.

## Response Structure

### Success Response
```json
{
  "status": true,
  "message": "Operation completed successfully",
  "data": { /* actual response data */ },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response
```json
{
  "status": false,
  "message": "Error description",
  "data": { "error": "Detailed error information" },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Status Codes

### Success Codes
- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **204 No Content**: Request successful, no content to return

### Client Error Codes
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Access denied
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict
- **422 Unprocessable Entity**: Validation failed

### Server Error Codes
- **500 Internal Server Error**: Server error
- **501 Not Implemented**: Feature not implemented
- **502 Bad Gateway**: Gateway error
- **503 Service Unavailable**: Service temporarily unavailable

## API Endpoints with Standardized Responses

### 1. Get Trading Cards by Category
```
GET /api/tradingCards/by-category/:categoryName
```

**Success Response (200):**
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
      "is_demo": "0",
      "haveitem": 1
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response (400):**
```json
{
  "status": false,
  "message": "Category name (slug) is required",
  "data": null,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response (404):**
```json
{
  "status": false,
  "message": "Category not found or no trading cards",
  "data": null,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Get All Trading Cards
```
GET /api/tradingCards
```

**Success Response (200):**
```json
{
  "status": true,
  "message": "Trading cards retrieved successfully",
  "data": [
    {
      "id": 1,
      "code": "TC001",
      "category_id": 1
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 3. Get Trading Card by ID
```
GET /api/tradingCards/:id
```

**Success Response (200):**
```json
{
  "status": true,
  "message": "Trading card retrieved successfully",
  "data": {
    "id": 1,
    "code": "TC001",
    "category_id": 1
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response (404):**
```json
{
  "status": false,
  "message": "Trading Card not found",
  "data": null,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 4. Get My Trading Cards by Category
```
GET /api/user/tradingCards/my-products/:categoryName
```

**Success Response (200):**
```json
{
  "status": true,
  "message": "My trading cards retrieved successfully",
  "data": {
    "tradingcards": [...],
    "pagination": {
      "page": 1,
      "perPage": 9,
      "total": 25,
      "totalPages": 3
    },
    "StagFilterForAllCategory": true,
    "MyCards": true,
    "stagDatas": [...],
    "stag_url_trader": "my-products/"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response (401):**
```json
{
  "status": false,
  "message": "Unauthorized",
  "data": null,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 5. Get Form Fields by Category
```
GET /api/user/tradingCards/form-fields/:categorySlug
```

**Success Response (200):**
```json
{
  "status": true,
  "message": "Form fields retrieved successfully",
  "data": {
    "category_id": 1,
    "CategoryField": [
      {
        "fields": "manufacturer_id",
        "is_required": 0,
        "additional_information": "1",
        "priority": 14,
        "item_column": {
          "id": 4,
          "label": "Manufacturer",
          "name": "manufacturer_id",
          "type": "select",
          "rel_model_index": "manufacturers",
          "rel_master_table": "Manufacturers",
          "rel_model_fun": "manufacturername",
          "rel_model_col": "manufacturer_name",
          "d_class": "col-md-6",
          "act_class": "",
          "do_not_show_on_detail": 0,
          "is_newline": 0,
          "maxlength": "",
          "input_maxlength": "",
          "is_ajax_load": 0,
          "is_js_load": 0,
          "label_options": "",
          "placeholder": "",
          "prefix": "",
          "graded_ungraded": 0,
          "option_values": "",
          "is_loop": "",
          "is_highlight": 0,
          "is_link": 0,
          "out_of_collapse": 0,
          "is_label_bold": 0,
          "not_for_demo_user": 0,
          "created_at": "2024-09-24T04:37:17.000000Z",
          "updated_at": "2024-10-01T23:34:45.000000Z"
        }
      }
    ],
    "CategoryFieldCollection": {},
    "SelectDownMasterDataId": [],
    "CategoryAjaxFieldCollection": [],
    "CategoryJSFieldCollection": [],
    "category": {
      "id": 1,
      "label": "Trading Cards",
      "slug": "trading-cards"
    },
    "categories": [...]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response (404):**
```json
{
  "status": false,
  "message": "Category not found",
  "data": null,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 6. Delete Trading Card
```
DELETE /api/tradingCards/:id
```

**Success Response (200):**
```json
{
  "status": true,
  "message": "Trading Card deleted successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 7. Not Implemented Endpoints
```
POST /api/tradingCards
PUT /api/tradingCards/:id
```

**Response (501):**
```json
{
  "status": false,
  "message": "Create trading card not implemented yet",
  "data": null,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Error Handling

### Standard Error Response
All errors follow the same pattern:
```json
{
  "status": false,
  "message": "Human readable error message",
  "data": {
    "error": "Detailed error information or stack trace"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Common Error Messages
- **400**: "Category name (slug) is required"
- **401**: "Unauthorized"
- **404**: "Category not found" / "Trading Card not found"
- **500**: "Internal server error"
- **501**: "Feature not implemented yet"

## Frontend Integration

### Success Handling
```javascript
fetch('/api/user/tradingCards/form-fields/trading-cards')
  .then(response => response.json())
  .then(data => {
    if (data.status === true) {
      // Success - use data.data
      const formFields = data.data.CategoryField;
      console.log('Form fields:', formFields);
    } else {
      // Error - show data.message
      console.error('Error:', data.message);
    }
  });
```

### Error Handling
```javascript
fetch('/api/user/tradingCards/form-fields/invalid-category')
  .then(response => response.json())
  .then(data => {
    if (data.status === false) {
      // Show error message
      showErrorMessage(data.message);
      
      // Log detailed error if available
      if (data.data && data.data.error) {
        console.error('Detailed error:', data.data.error);
      }
    }
  });
```

### Status Code Handling
```javascript
fetch('/api/user/tradingCards/form-fields/trading-cards')
  .then(response => {
    if (response.ok) {
      return response.json();
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  })
  .then(data => {
    if (data.status === true) {
      // Handle success
      handleSuccess(data.data);
    } else {
      // Handle API error
      handleApiError(data.message);
    }
  })
  .catch(error => {
    // Handle network/HTTP errors
    handleNetworkError(error.message);
  });
```

## Benefits of Standardized Responses

1. **Consistent Structure**: All endpoints return the same response format
2. **Clear Status Indication**: `status` boolean flag for easy checking
3. **Human Readable Messages**: Clear error messages for users
4. **Detailed Error Information**: Technical details for developers
5. **Timestamp**: When the response was generated
6. **Easy Frontend Integration**: Predictable response structure
7. **Better Error Handling**: Consistent error response format
8. **API Documentation**: Clear response examples for developers

## Implementation Notes

- All responses use the `sendApiResponse` helper function
- Status codes follow HTTP standards
- Error messages are user-friendly
- Technical details are included in `data.error` for debugging
- Timestamps are in ISO 8601 format
- The `status` field is always a boolean (true/false)
