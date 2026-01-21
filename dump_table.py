
import openpyxl

file_path = r'C:\Users\mhass\OneDrive\Desktop\DUMP\mine\calc.xlsx'

try:
    wb = openpyxl.load_workbook(filename=file_path, data_only=True)
    sheet = wb.active # GPACalculator

    print("--- Marks vs QP (Rows 50-80) ---")
    print("Row | M3(BK) | Q3(BL) | M4(BM) | Q4(BN) | M5(BO) | Q5(BP)")
    
    for r in range(50, 81):
        vals = []
        for c in [63, 64, 65, 66, 67, 68]:
             val = sheet.cell(row=r, column=c).value
             vals.append(str(val) if val is not None else "-")
        # Check if values exist
        print(f"{r} | " + " | ".join(vals))

except Exception as e:
    print(f"Error: {e}")
