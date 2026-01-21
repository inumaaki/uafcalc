
import pandas as pd

file_path = r'C:\Users\mhass\OneDrive\Desktop\DUMP\mine\calc.xlsx'

try:
    df = pd.read_excel(file_path, header=None)
    
    # Search for keywords
    keywords = ["Marks", "Obtained", "Grade", "Point", "GP", "Quality"]
    
    found = False
    for r_idx, row in df.iterrows():
        row_str = " ".join([str(x) for x in row if pd.notna(x)])
        for k in keywords:
            if k in row_str:
                print(f"Row {r_idx}: {row_str}")
                # Print next few rows to see data
                print(df.iloc[r_idx+1:r_idx+6].to_string())
                found = True
                break
        if found: break # Just find the first occurrence for now
        
    # Also just print a slice of the sheet to eyeball it
    print("\n--- Slice of Sheet (Rows 0-20, Cols 0-10) ---")
    print(df.iloc[0:20, 0:10].to_string())

except Exception as e:
    print(e)
