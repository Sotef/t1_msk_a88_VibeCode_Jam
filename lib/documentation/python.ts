/**
 * Документация для стандартных функций Python
 */

export interface FunctionDoc {
  signature: string
  description: string
  parameters: Array<{
    name: string
    type: string
    description: string
    optional?: boolean
  }>
  returns: {
    type: string
    description: string
  }
  examples: string[]
}

export const pythonDocs: Record<string, FunctionDoc> = {
  len: {
    signature: "len(iterable)",
    description: "Возвращает количество элементов в итерируемом объекте (список, строка, словарь, кортеж и т.д.)",
    parameters: [
      {
        name: "iterable",
        type: "iterable",
        description: "Итерируемый объект (list, str, dict, tuple, set и т.д.)"
      }
    ],
    returns: {
      type: "int",
      description: "Количество элементов в объекте"
    },
    examples: [
      "len([1, 2, 3])      # 3",
      "len('hello')        # 5",
      "len({'a': 1, 'b': 2})  # 2",
      "len((1, 2, 3, 4))   # 4"
    ]
  },
  range: {
    signature: "range(stop) | range(start, stop[, step])",
    description: "Создает последовательность чисел. Используется в циклах for для итерации по числам.",
    parameters: [
      {
        name: "start",
        type: "int",
        description: "Начальное значение (по умолчанию 0)",
        optional: true
      },
      {
        name: "stop",
        type: "int",
        description: "Конечное значение (не включается в последовательность)"
      },
      {
        name: "step",
        type: "int",
        description: "Шаг между числами (по умолчанию 1)",
        optional: true
      }
    ],
    returns: {
      type: "range",
      description: "Объект range (итерируемая последовательность чисел)"
    },
    examples: [
      "list(range(5))           # [0, 1, 2, 3, 4]",
      "list(range(2, 5))        # [2, 3, 4]",
      "list(range(0, 10, 2))    # [0, 2, 4, 6, 8]",
      "list(range(10, 0, -1))   # [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]"
    ]
  },
  sorted: {
    signature: "sorted(iterable, key=None, reverse=False)",
    description: "Возвращает новый отсортированный список из элементов итерируемого объекта.",
    parameters: [
      {
        name: "iterable",
        type: "iterable",
        description: "Итерируемый объект для сортировки"
      },
      {
        name: "key",
        type: "function",
        description: "Функция для определения ключа сортировки (опционально)",
        optional: true
      },
      {
        name: "reverse",
        type: "bool",
        description: "Если True, сортировка в обратном порядке (по умолчанию False)",
        optional: true
      }
    ],
    returns: {
      type: "list",
      description: "Новый отсортированный список"
    },
    examples: [
      "sorted([3, 1, 4, 1, 5])           # [1, 1, 3, 4, 5]",
      "sorted([3, 1, 4], reverse=True)   # [4, 3, 1]",
      "sorted(['apple', 'banana', 'cherry'], key=len)  # ['apple', 'banana', 'cherry']"
    ]
  },
  list: {
    signature: "list([iterable])",
    description: "Создает новый список. Без аргументов создает пустой список.",
    parameters: [
      {
        name: "iterable",
        type: "iterable",
        description: "Итерируемый объект для преобразования в список (опционально)",
        optional: true
      }
    ],
    returns: {
      type: "list",
      description: "Новый список"
    },
    examples: [
      "list()              # []",
      "list('abc')         # ['a', 'b', 'c']",
      "list(range(3))      # [0, 1, 2]",
      "list((1, 2, 3))     # [1, 2, 3]"
    ]
  },
  dict: {
    signature: "dict(**kwargs) | dict(mapping) | dict(iterable)",
    description: "Создает новый словарь. Может быть создан из ключевых слов, отображения или итерируемого объекта пар (ключ, значение).",
    parameters: [
      {
        name: "kwargs",
        type: "**kwargs",
        description: "Ключевые слова для создания словаря",
        optional: true
      }
    ],
    returns: {
      type: "dict",
      description: "Новый словарь"
    },
    examples: [
      "dict()                    # {}",
      "dict(a=1, b=2)            # {'a': 1, 'b': 2}",
      "dict([('a', 1), ('b', 2)])  # {'a': 1, 'b': 2}",
      "dict({'a': 1, 'b': 2})   # {'a': 1, 'b': 2}"
    ]
  },
  str: {
    signature: "str([object])",
    description: "Преобразует объект в строку. Без аргументов возвращает пустую строку.",
    parameters: [
      {
        name: "object",
        type: "object",
        description: "Объект для преобразования в строку (опционально)",
        optional: true
      }
    ],
    returns: {
      type: "str",
      description: "Строковое представление объекта"
    },
    examples: [
      "str(123)        # '123'",
      "str([1, 2, 3])  # '[1, 2, 3]'",
      "str(None)       # 'None'",
      "str()           # ''"
    ]
  },
  int: {
    signature: "int([x]) | int(x, base=10)",
    description: "Преобразует число или строку в целое число. Без аргументов возвращает 0.",
    parameters: [
      {
        name: "x",
        type: "number | str",
        description: "Число или строка для преобразования (опционально)",
        optional: true
      },
      {
        name: "base",
        type: "int",
        description: "Основание системы счисления (по умолчанию 10)",
        optional: true
      }
    ],
    returns: {
      type: "int",
      description: "Целое число"
    },
    examples: [
      "int()           # 0",
      "int('123')      # 123",
      "int(3.14)       # 3",
      "int('1010', 2)  # 10"
    ]
  },
  max: {
    signature: "max(iterable, *args, key=None)",
    description: "Возвращает наибольший элемент в итерируемом объекте или среди аргументов.",
    parameters: [
      {
        name: "iterable",
        type: "iterable",
        description: "Итерируемый объект"
      },
      {
        name: "key",
        type: "function",
        description: "Функция для определения ключа сравнения (опционально)",
        optional: true
      }
    ],
    returns: {
      type: "any",
      description: "Наибольший элемент"
    },
    examples: [
      "max([1, 5, 3, 9, 2])        # 9",
      "max('hello')                # 'o'",
      "max([1, 2, 3], [4, 5])      # [4, 5]",
      "max(['a', 'abc', 'ab'], key=len)  # 'abc'"
    ]
  },
  min: {
    signature: "min(iterable, *args, key=None)",
    description: "Возвращает наименьший элемент в итерируемом объекте или среди аргументов.",
    parameters: [
      {
        name: "iterable",
        type: "iterable",
        description: "Итерируемый объект"
      },
      {
        name: "key",
        type: "function",
        description: "Функция для определения ключа сравнения (опционально)",
        optional: true
      }
    ],
    returns: {
      type: "any",
      description: "Наименьший элемент"
    },
    examples: [
      "min([1, 5, 3, 9, 2])        # 1",
      "min('hello')                # 'e'",
      "min([1, 2, 3], [4, 5])      # [1, 2, 3]"
    ]
  },
  sum: {
    signature: "sum(iterable, start=0)",
    description: "Возвращает сумму всех элементов итерируемого объекта.",
    parameters: [
      {
        name: "iterable",
        type: "iterable",
        description: "Итерируемый объект с числами"
      },
      {
        name: "start",
        type: "number",
        description: "Начальное значение суммы (по умолчанию 0)",
        optional: true
      }
    ],
    returns: {
      type: "number",
      description: "Сумма всех элементов"
    },
    examples: [
      "sum([1, 2, 3, 4])     # 10",
      "sum([1, 2, 3], 10)    # 16",
      "sum([])               # 0"
    ]
  },
  enumerate: {
    signature: "enumerate(iterable, start=0)",
    description: "Возвращает объект enumerate, который генерирует пары (индекс, элемент) для каждого элемента итерируемого объекта.",
    parameters: [
      {
        name: "iterable",
        type: "iterable",
        description: "Итерируемый объект"
      },
      {
        name: "start",
        type: "int",
        description: "Начальное значение индекса (по умолчанию 0)",
        optional: true
      }
    ],
    returns: {
      type: "enumerate",
      description: "Объект enumerate (итерируемый объект пар (индекс, элемент))"
    },
    examples: [
      "list(enumerate(['a', 'b', 'c']))  # [(0, 'a'), (1, 'b'), (2, 'c')]",
      "list(enumerate(['a', 'b'], 1))    # [(1, 'a'), (2, 'b')]",
      "for i, item in enumerate(['a', 'b']): print(i, item)"
    ]
  },
  zip: {
    signature: "zip(*iterables)",
    description: "Объединяет несколько итерируемых объектов в один итерируемый объект кортежей. Останавливается, когда самая короткая последовательность заканчивается.",
    parameters: [
      {
        name: "*iterables",
        type: "iterable",
        description: "Один или несколько итерируемых объектов"
      }
    ],
    returns: {
      type: "zip",
      description: "Объект zip (итерируемый объект кортежей)"
    },
    examples: [
      "list(zip([1, 2], ['a', 'b']))           # [(1, 'a'), (2, 'b')]",
      "list(zip([1, 2, 3], ['a', 'b']))       # [(1, 'a'), (2, 'b')]",
      "for num, letter in zip([1, 2], ['a', 'b']): print(num, letter)"
    ]
  },
  map: {
    signature: "map(function, iterable, *iterables)",
    description: "Применяет функцию к каждому элементу итерируемого объекта и возвращает итератор результатов.",
    parameters: [
      {
        name: "function",
        type: "function",
        description: "Функция для применения к каждому элементу"
      },
      {
        name: "iterable",
        type: "iterable",
        description: "Итерируемый объект"
      }
    ],
    returns: {
      type: "map",
      description: "Итератор результатов применения функции"
    },
    examples: [
      "list(map(str, [1, 2, 3]))           # ['1', '2', '3']",
      "list(map(lambda x: x * 2, [1, 2, 3]))  # [2, 4, 6]",
      "list(map(int, ['1', '2', '3']))     # [1, 2, 3]"
    ]
  },
  filter: {
    signature: "filter(function, iterable)",
    description: "Фильтрует элементы итерируемого объекта, оставляя только те, для которых функция возвращает True.",
    parameters: [
      {
        name: "function",
        type: "function | None",
        description: "Функция для фильтрации (или None для фильтрации истинных значений)"
      },
      {
        name: "iterable",
        type: "iterable",
        description: "Итерируемый объект"
      }
    ],
    returns: {
      type: "filter",
      description: "Итератор отфильтрованных элементов"
    },
    examples: [
      "list(filter(lambda x: x > 0, [-1, 0, 1, 2]))  # [1, 2]",
      "list(filter(None, [0, 1, False, True, '']))   # [1, True]",
      "list(filter(str.isdigit, ['a', '1', 'b', '2']))  # ['1', '2']"
    ]
  },
  any: {
    signature: "any(iterable)",
    description: "Возвращает True, если хотя бы один элемент итерируемого объекта истинен (truthy).",
    parameters: [
      {
        name: "iterable",
        type: "iterable",
        description: "Итерируемый объект"
      }
    ],
    returns: {
      type: "bool",
      description: "True, если хотя бы один элемент истинен, иначе False"
    },
    examples: [
      "any([False, False, True])   # True",
      "any([False, False, False]) # False",
      "any([0, '', None])         # False",
      "any([1, 0, ''])           # True"
    ]
  },
  all: {
    signature: "all(iterable)",
    description: "Возвращает True, если все элементы итерируемого объекта истинны (truthy).",
    parameters: [
      {
        name: "iterable",
        type: "iterable",
        description: "Итерируемый объект"
      }
    ],
    returns: {
      type: "bool",
      description: "True, если все элементы истинны, иначе False"
    },
    examples: [
      "all([True, True, True])    # True",
      "all([True, False, True])   # False",
      "all([1, 2, 3])            # True",
      "all([1, 0, 3])            # False"
    ]
  }
}

