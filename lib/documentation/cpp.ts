/**
 * Документация для стандартных функций C++
 */

import type { FunctionDoc } from "./python"

export const cppDocs: Record<string, FunctionDoc> = {
  "std::vector": {
    signature: "std::vector<T>",
    description: "Динамический массив, который может изменять свой размер во время выполнения.",
    parameters: [],
    returns: {
      type: "std::vector<T>",
      description: "Вектор элементов типа T"
    },
    examples: [
      "std::vector<int> v;              // пустой вектор",
      "std::vector<int> v(5);           // вектор из 5 нулей",
      "std::vector<int> v = {1, 2, 3};  // вектор с начальными значениями"
    ]
  },
  "std::string": {
    signature: "std::string",
    description: "Класс для работы со строками. Представляет последовательность символов.",
    parameters: [],
    returns: {
      type: "std::string",
      description: "Строка символов"
    },
    examples: [
      "std::string s;                   // пустая строка",
      "std::string s = \"hello\";       // строка с начальным значением",
      "std::string s(5, 'a');           // строка из 5 символов 'a'"
    ]
  },
  "std::sort": {
    signature: "std::sort(first, last[, comp])",
    description: "Сортирует элементы в диапазоне [first, last) в порядке возрастания.",
    parameters: [
      {
        name: "first",
        type: "iterator",
        description: "Итератор на первый элемент"
      },
      {
        name: "last",
        type: "iterator",
        description: "Итератор на элемент после последнего"
      },
      {
        name: "comp",
        type: "function",
        description: "Функция сравнения (опционально)",
        optional: true
      }
    ],
    returns: {
      type: "void",
      description: "Не возвращает значение, сортирует на месте"
    },
    examples: [
      "std::vector<int> v = {3, 1, 4, 1, 5};",
      "std::sort(v.begin(), v.end());   // v = [1, 1, 3, 4, 5]",
      "std::sort(v.begin(), v.end(), std::greater<int>());  // по убыванию"
    ]
  },
  "std::max": {
    signature: "std::max(a, b[, comp])",
    description: "Возвращает наибольшее из двух значений.",
    parameters: [
      {
        name: "a",
        type: "T",
        description: "Первое значение"
      },
      {
        name: "b",
        type: "T",
        description: "Второе значение"
      },
      {
        name: "comp",
        type: "function",
        description: "Функция сравнения (опционально)",
        optional: true
      }
    ],
    returns: {
      type: "T",
      description: "Наибольшее значение"
    },
    examples: [
      "std::max(3, 5)                   // 5",
      "std::max('a', 'z')               // 'z'",
      "std::max({1, 2, 3, 4})          // 4 (C++11)"
    ]
  },
  "std::min": {
    signature: "std::min(a, b[, comp])",
    description: "Возвращает наименьшее из двух значений.",
    parameters: [
      {
        name: "a",
        type: "T",
        description: "Первое значение"
      },
      {
        name: "b",
        type: "T",
        description: "Второе значение"
      },
      {
        name: "comp",
        type: "function",
        description: "Функция сравнения (опционально)",
        optional: true
      }
    ],
    returns: {
      type: "T",
      description: "Наименьшее значение"
    },
    examples: [
      "std::min(3, 5)                   // 3",
      "std::min('a', 'z')               // 'a'",
      "std::min({1, 2, 3, 4})          // 1 (C++11)"
    ]
  }
}

