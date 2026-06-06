file_path = r"c:\Users\9\Desktop\meloddyCMS\public\css\style.css"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
for idx in range(2215, min(2245, len(lines))):
    print(f"{idx+1}: {repr(lines[idx])}")
