import json
import re

path = r"C:\Users\9\.gemini\antigravity-ide\brain\0a45fff8-b04b-43ef-a45c-0164b7c0057a\.system_generated\logs\transcript.jsonl"

found_products = []

with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        if 'productList' in line or 'sneakerbox' in line:
            # Попробуем поискать массивы товаров в строке
            # Например, если там есть JSON-подобные структуры
            matches = re.findall(r'\[\s*\{\s*"name"\s*:\s*".*?"\s*,\s*"price"\s*:\s*.*\}\s*\]', line)
            if matches:
                for m in matches:
                    try:
                        data = json.loads(m)
                        if len(data) > len(found_products):
                            found_products = data
                    except:
                        pass
            
            # Также попробуем найти через простой поиск подстрок
            # Например, если там есть большой JSON массив
            # Ищем подстроки, начинающиеся на [ и заканчивающиеся на ]
            for start in [m.start() for m in re.finditer(r'\[', line)]:
                # Попробуем распарсить от этой скобки до конца или до ]
                for end in [m.start() for m in re.finditer(r'\]', line)]:
                    if end > start + 100:
                        try:
                            candidate = line[start:end+1]
                            # Раскодируем экранированные символы, если они есть
                            candidate_unescaped = candidate.encode('utf-8').decode('unicode-escape')
                            data = json.loads(candidate_unescaped)
                            if isinstance(data, list) and len(data) > 0 and 'name' in data[0] and 'price' in data[0]:
                                if len(data) > len(found_products):
                                    found_products = data
                        except:
                            try:
                                candidate = line[start:end+1]
                                data = json.loads(candidate)
                                if isinstance(data, list) and len(data) > 0 and 'name' in data[0] and 'price' in data[0]:
                                    if len(data) > len(found_products):
                                        found_products = data
                            except:
                                pass

if found_products:
    print(f"Найдено товаров: {len(found_products)}")
    with open(r"c:\Users\9\Desktop\meloddyCMS\scratch\sneakers.json", "w", encoding="utf-8") as out:
        json.dump(found_products, out, indent=2, ensure_ascii=False)
    print("Сохранено в sneakers.json")
else:
    # Давайте просто поищем все строки, содержащие 'productList', и выведем их длину
    print("Товары не найдены регуляркой. Ищем строки...")
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f):
            if 'productList' in line:
                print(f"Строка {idx}: длина {len(line)}")
                # Выведем первые 200 символов и последние 200 символов
                print(line[:200])
                print("...")
                print(line[-200:])
                # Попробуем просто сохранить всю строку, содержащую 'productList', чтобы разобраться
                with open(r"c:\Users\9\Desktop\meloddyCMS\scratch\raw_line.txt", "w", encoding="utf-8") as r_out:
                    r_out.write(line)
                print("Сохранено сырую строку в raw_line.txt")
                break
