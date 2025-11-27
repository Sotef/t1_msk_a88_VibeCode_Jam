/**
 * Документация для стандартных функций JavaScript
 */

import type { FunctionDoc } from "./python"

export const javascriptDocs: Record<string, FunctionDoc> = {
  "Array.map": {
    signature: "array.map(callback(element, index, array))",
    description: "Создает новый массив с результатами вызова функции для каждого элемента исходного массива.",
    parameters: [
      {
        name: "callback",
        type: "function",
        description: "Функция, вызываемая для каждого элемента массива"
      }
    ],
    returns: {
      type: "Array",
      description: "Новый массив с результатами вызова функции"
    },
    examples: [
      "[1, 2, 3].map(x => x * 2)        // [2, 4, 6]",
      "['a', 'b'].map((x, i) => i)     // [0, 1]",
      "[1, 2, 3].map(String)            // ['1', '2', '3']"
    ]
  },
  "Array.filter": {
    signature: "array.filter(callback(element, index, array))",
    description: "Создает новый массив со всеми элементами, прошедшими проверку функции.",
    parameters: [
      {
        name: "callback",
        type: "function",
        description: "Функция-предикат для проверки каждого элемента"
      }
    ],
    returns: {
      type: "Array",
      description: "Новый массив с отфильтрованными элементами"
    },
    examples: [
      "[1, 2, 3, 4].filter(x => x > 2)     // [3, 4]",
      "['a', 'b', 'c'].filter(x => x !== 'b')  // ['a', 'c']",
      "[1, 2, 3].filter(x => x % 2 === 0)  // [2]"
    ]
  },
  "Array.reduce": {
    signature: "array.reduce(callback(accumulator, currentValue, index, array), initialValue)",
    description: "Применяет функцию к аккумулятору и каждому элементу массива, возвращая одно значение.",
    parameters: [
      {
        name: "callback",
        type: "function",
        description: "Функция для выполнения на каждом элементе"
      },
      {
        name: "initialValue",
        type: "any",
        description: "Начальное значение аккумулятора (опционально)",
        optional: true
      }
    ],
    returns: {
      type: "any",
      description: "Накопленное значение"
    },
    examples: [
      "[1, 2, 3].reduce((a, b) => a + b)        // 6",
      "[1, 2, 3].reduce((a, b) => a + b, 10)    // 16",
      "[[1, 2], [3, 4]].reduce((a, b) => a.concat(b), [])  // [1, 2, 3, 4]"
    ]
  },
  "Array.find": {
    signature: "array.find(callback(element, index, array))",
    description: "Возвращает первый элемент массива, удовлетворяющий условию функции, или undefined.",
    parameters: [
      {
        name: "callback",
        type: "function",
        description: "Функция-предикат для проверки каждого элемента"
      }
    ],
    returns: {
      type: "any | undefined",
      description: "Первый найденный элемент или undefined"
    },
    examples: [
      "[1, 2, 3, 4].find(x => x > 2)     // 3",
      "[1, 2, 3].find(x => x > 10)       // undefined",
      "[{a: 1}, {a: 2}].find(x => x.a === 2)  // {a: 2}"
    ]
  },
  "Array.includes": {
    signature: "array.includes(searchElement, fromIndex)",
    description: "Определяет, содержит ли массив определенный элемент, возвращая true или false.",
    parameters: [
      {
        name: "searchElement",
        type: "any",
        description: "Элемент для поиска"
      },
      {
        name: "fromIndex",
        type: "number",
        description: "Индекс, с которого начинать поиск (опционально)",
        optional: true
      }
    ],
    returns: {
      type: "boolean",
      description: "True, если элемент найден, иначе False"
    },
    examples: [
      "[1, 2, 3].includes(2)        // true",
      "[1, 2, 3].includes(4)         // false",
      "['a', 'b'].includes('a')     // true"
    ]
  },
  "Object.keys": {
    signature: "Object.keys(object)",
    description: "Возвращает массив строк с именами собственных перечисляемых свойств объекта.",
    parameters: [
      {
        name: "object",
        type: "object",
        description: "Объект, чьи перечисляемые свойства будут возвращены"
      }
    ],
    returns: {
      type: "Array<string>",
      description: "Массив строк с именами свойств"
    },
    examples: [
      "Object.keys({a: 1, b: 2})        // ['a', 'b']",
      "Object.keys({})                   // []",
      "Object.keys([1, 2, 3])           // ['0', '1', '2']"
    ]
  },
  "Object.values": {
    signature: "Object.values(object)",
    description: "Возвращает массив значений собственных перечисляемых свойств объекта.",
    parameters: [
      {
        name: "object",
        type: "object",
        description: "Объект, чьи значения свойств будут возвращены"
      }
    ],
    returns: {
      type: "Array<any>",
      description: "Массив значений свойств"
    },
    examples: [
      "Object.values({a: 1, b: 2})      // [1, 2]",
      "Object.values({})                // []",
      "Object.values([1, 2, 3])         // [1, 2, 3]"
    ]
  },
  "JSON.parse": {
    signature: "JSON.parse(text, reviver)",
    description: "Парсит строку JSON и возвращает объект JavaScript.",
    parameters: [
      {
        name: "text",
        type: "string",
        description: "Строка JSON для парсинга"
      },
      {
        name: "reviver",
        type: "function",
        description: "Функция для преобразования значений (опционально)",
        optional: true
      }
    ],
    returns: {
      type: "any",
      description: "Объект JavaScript, соответствующий JSON"
    },
    examples: [
      "JSON.parse('{\"a\": 1}')         // {a: 1}",
      "JSON.parse('[1, 2, 3]')         // [1, 2, 3]",
      "JSON.parse('\"hello\"')          // 'hello'"
    ]
  },
  "JSON.stringify": {
    signature: "JSON.stringify(value, replacer, space)",
    description: "Преобразует объект JavaScript в строку JSON.",
    parameters: [
      {
        name: "value",
        type: "any",
        description: "Значение для преобразования в JSON"
      },
      {
        name: "replacer",
        type: "function | Array",
        description: "Функция или массив для фильтрации свойств (опционально)",
        optional: true
      },
      {
        name: "space",
        type: "number | string",
        description: "Количество пробелов для отступов (опционально)",
        optional: true
      }
    ],
    returns: {
      type: "string",
      description: "Строка JSON"
    },
    examples: [
      "JSON.stringify({a: 1})           // '{\"a\":1}'",
      "JSON.stringify([1, 2, 3])        // '[1,2,3]'",
      "JSON.stringify({a: 1}, null, 2)  // '{\\n  \"a\": 1\\n}'"
    ]
  }
}

