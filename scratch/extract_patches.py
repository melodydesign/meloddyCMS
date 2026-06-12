import json
import re

path = r"C:\Users\9\.gemini\antigravity-ide\brain\0a45fff8-b04b-43ef-a45c-0164b7c0057a\.system_generated\logs\transcript.jsonl"

with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    for idx, line in enumerate(f):
        try:
            step = json.loads(line)
        except Exception as e:
            continue
        
        # Если это шаг субагента, посмотрим, нет ли там отчета
        if step.get('type') == 'BROWSER_SUBAGENT':
            content = step.get('content', '')
            print(f"Шаг BROWSER_SUBAGENT {step.get('step_index')}:")
            # Поищем упоминания о товарах в отчете
            if '25' in content or 'товаров' in content or 'sneakers' in content or 'productList' in content:
                print("Найден потенциальный отчет субагента:")
                # Запишем отчет в файл для изучения
                with open(r"c:\Users\9\Desktop\meloddyCMS\scratch\subagent_report.txt", "w", encoding="utf-8") as rep_out:
                    rep_out.write(content)
                print("Отчет записан в subagent_report.txt")
        
        # Поищем вызовы инструментов
        tool_calls = step.get('tool_calls', [])
        for tc in tool_calls:
            if tc.get('name') == 'browser_subagent':
                task = tc.get('args', {}).get('Task', '')
                print(f"Вызов browser_subagent с задачей: {task[:200]}...")
            
            # Если это вызов javascript в браузере
            if 'execute_browser_javascript' in tc.get('name', ''):
                # Может быть, тут возвращаются данные?
                pass
        
        # Посмотрим на ответы системы на вызовы инструментов
        if step.get('type') == 'TOOL_RESPONSE' or 'content' in step:
            content = step.get('content', '')
            if 'productList' in content or 'window.productList' in content:
                print(f"Найден TOOL_RESPONSE или content на шаге {step.get('step_index')} длиной {len(content)}")
                # Попробуем извлечь JSON
                # Ищем JSON-массив
                # В логе может быть строка типа: Output:\n[{"name": ...}]
                # Попробуем найти все вхождения `[{` и `}]`
                for m_start in re.finditer(r'\[\s*\{\s*"name"', content):
                    start_idx = m_start.start()
                    # Ищем закрывающую скобку
                    for m_end in re.finditer(r'\}\s*\]', content[start_idx:]):
                        end_idx = start_idx + m_end.end()
                        cand = content[start_idx:end_idx]
                        try:
                            data = json.loads(cand)
                            if isinstance(data, list) and len(data) > 0:
                                print(f"Успешно распарсен JSON массив товаров из TOOL_RESPONSE! Товаров: {len(data)}")
                                with open(r"c:\Users\9\Desktop\meloddyCMS\scratch\sneakers.json", "w", encoding="utf-8") as out:
                                    json.dump(data, out, indent=2, ensure_ascii=False)
                                print("Сохранено в sneakers.json")
                                break
                        except Exception as ex:
                            pass
