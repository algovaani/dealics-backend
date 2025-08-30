# CategoryField Response Structure

## Overview
This document shows the exact structure of the `CategoryField` array response from the API, matching your Laravel response format.

## CategoryField Array Response

```typescript
CategoryField: [
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
  },
  {
    "fields": "another_field_name",
    "is_required": 1,
    "additional_information": "0",
    "priority": 15,
    "item_column": {
      "id": 5,
      "label": "Another Field",
      "name": "another_field_name",
      "type": "text",
      "rel_model_index": "other_table",
      "rel_master_table": "OtherTable",
      "rel_model_fun": "otherfunction",
      "rel_model_col": "other_column",
      "d_class": "col-md-12",
      "act_class": "",
      "do_not_show_on_detail": 0,
      "is_newline": 1,
      "maxlength": "255",
      "input_maxlength": "255",
      "is_ajax_load": 1,
      "is_js_load": 0,
      "label_options": "",
      "placeholder": "Enter value",
      "prefix": "",
      "graded_ungraded": 0,
      "option_values": "",
      "is_loop": "",
      "is_highlight": 0,
      "is_link": 0,
      "out_of_collapse": 0,
      "is_label_bold": 1,
      "not_for_demo_user": 0,
      "created_at": "2024-09-24T04:37:17.000000Z",
      "updated_at": "2024-10-01T23:34:45.000000Z"
    }
  }
]
```

## Field Properties

### Main Field Properties
- **`fields`** (string): Field identifier (e.g., "manufacturer_id")
- **`is_required`** (number): Whether field is required (0 = false, 1 = true)
- **`additional_information`** (string): Additional field information
- **`priority`** (number): Field display priority order
- **`item_column`** (object): Complete item column configuration

### Item Column Properties

#### Basic Information
- **`id`** (number): Unique identifier
- **`label`** (string): Display label (e.g., "Manufacturer")
- **`name`** (string): Field name (e.g., "manufacturer_id")
- **`type`** (string): Input type (e.g., "select", "text", "number")

#### Relationship Data
- **`rel_model_index`** (string): Related model index (e.g., "manufacturers")
- **`rel_master_table`** (string): Master data table (e.g., "Manufacturers")
- **`rel_model_fun`** (string): Related model function (e.g., "manufacturername")
- **`rel_model_col`** (string): Related model column (e.g., "manufacturer_name")

#### UI Properties
- **`d_class`** (string): CSS class for display (e.g., "col-md-6")
- **`act_class`** (string): Action CSS class
- **`is_newline`** (number): Whether to start on new line (0 = false, 1 = true)
- **`maxlength`** (string): Maximum input length
- **`input_maxlength`** (string): Input maximum length

#### Behavior Flags
- **`is_ajax_load`** (number): Whether field loads via AJAX (0 = false, 1 = true)
- **`is_js_load`** (number): Whether field loads via JavaScript (0 = false, 1 = true)
- **`is_highlight`** (number): Whether field should be highlighted
- **`is_link`** (number): Whether field is a link
- **`out_of_collapse`** (number): Whether field is outside collapse section
- **`is_label_bold`** (number): Whether label should be bold
- **`not_for_demo_user`** (number): Whether field is hidden for demo users

#### Additional Properties
- **`do_not_show_on_detail`** (number): Whether to hide on detail view
- **`label_options`** (string): Label display options
- **`placeholder`** (string): Input placeholder text
- **`prefix`** (string): Field prefix
- **`graded_ungraded`** (number): Graded/ungraded flag
- **`option_values`** (string): Available option values
- **`is_loop`** (string): Loop configuration

#### Timestamps
- **`created_at`** (string): Creation timestamp (ISO format)
- **`updated_at`** (string): Last update timestamp (ISO format)

## Example Usage

### Frontend Form Generation
```javascript
// Generate form fields from CategoryField response
CategoryField.forEach(field => {
  const fieldConfig = field.item_column;
  
  if (fieldConfig.type === 'select') {
    // Create select dropdown
    createSelectField(fieldConfig.label, fieldConfig.name, field.is_required);
  } else if (fieldConfig.type === 'text') {
    // Create text input
    createTextField(fieldConfig.label, fieldConfig.name, field.is_required, fieldConfig.maxlength);
  }
});
```

### Field Validation
```javascript
// Check if field is required
if (field.is_required === 1) {
  // Add required validation
  addRequiredValidation(field.item_column.name);
}

// Check AJAX loading
if (field.item_column.is_ajax_load === 1) {
  // Setup AJAX loading
  setupAjaxLoading(field.item_column.name, field.item_column.rel_master_table);
}
```

### CSS Classes
```javascript
// Apply CSS classes
const fieldElement = document.getElementById(field.item_column.name);
fieldElement.className = field.item_column.d_class;

if (field.item_column.is_newline === 1) {
  fieldElement.style.display = 'block';
}
```

## Notes

1. **Priority Ordering**: Fields are returned in priority order (lowest to highest)
2. **Required Fields**: `is_required` uses 0/1 instead of boolean for compatibility
3. **Empty Values**: Empty strings (`""`) indicate no value set
4. **Timestamps**: All timestamps are in ISO 8601 format
5. **Field Matching**: The API automatically matches `category_fields.fields` with `item_columns.name`

This structure exactly matches your Laravel response and provides all the information needed to generate dynamic forms on the frontend.
