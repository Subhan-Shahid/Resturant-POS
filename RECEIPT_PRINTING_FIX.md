# Receipt Printing Alignment Fix

## Issue Description
The receipt printing had alignment issues where:
1. When printing from the "Print Invoice" button, receipts were correctly aligned
2. When reprinting from the "Recent Sales" or other reprint buttons, receipts had alignment problems
3. Some receipts printed only on the right side or left side
4. Some receipts were cut off vertically (half printed)

## Root Cause
The application had two different receipt generation methods:
1. **Silent printing** (used for "Print Invoice") - Used SVG-based approach which worked correctly
2. **Regular printing** (used for reprinting) - Used HTML/CSS approach which had alignment issues

## Solution
Unified all receipt generation to use the same SVG-based approach for consistency and reliability.

## Files Modified

### 1. src/pages/RecentSales.jsx
- Updated the [reprint](file:///e:/New%20folder%20(4)/src/pages/RecentSales.jsx#L103-L157) function to use SVG-based receipt generation
- Replaced HTML/CSS approach with SVG approach for consistent printing

### 2. src/pages/PosCategory.jsx
- Updated the [generateReceiptHtml](file:///e:/New%20folder%20(4)/src/pages/PosCategory.jsx#L235-L295) function to use SVG-based receipt generation
- Ensured consistency between initial printing and reprinting

### 3. src/pages/SaleHistory.jsx
- Updated the [reprint](file:///e:/New%20folder%20(4)/src/pages/SaleHistory.jsx#L93-L135) function to use SVG-based receipt generation

### 4. src/pages/ReturnOrder.jsx
- Updated the [reprint](file:///e:/New%20folder%20(4)/src/pages/ReturnOrder.jsx#L93-L135) function to use SVG-based receipt generation

### 5. src/pages/DayClose.jsx
- Updated the [reprint](file:///e:/New%20folder%20(4)/src/pages/DayClose.jsx#L104-L144) function to use SVG-based receipt generation
- Updated the [buildSaleReceiptHtml](file:///e:/New%20folder%20(4)/src/pages/DayClose.jsx#L489-L551) function to use SVG-based receipt generation

## Benefits of the Fix

1. **Consistent Printing**: All receipts now use the same reliable SVG-based approach
2. **Better Alignment**: No more half-printed or misaligned receipts
3. **Full Receipt Printing**: Receipts now print completely without cutting off
4. **Cross-Platform Compatibility**: SVG approach works better across different printers and drivers
5. **Thermal Printer Friendly**: SVG approach is more reliable for thermal receipt printers

## Technical Details

The SVG-based approach:
- Uses fixed-width SVG canvas (520px width)
- Properly positions text elements using absolute coordinates
- Avoids CSS flexbox issues that caused alignment problems
- Works consistently across different printer drivers
- Ensures full receipt height is calculated correctly

## Testing

After applying these changes:
1. All receipt printing (initial and reprint) should work consistently
2. Receipts should be properly aligned on both sides
3. Full receipt content should be visible
4. Bold text styling should be preserved
5. Printing should work reliably on thermal receipt printers