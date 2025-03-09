/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  OR: 1,
  AND: 2,
  COMPARE: 3,
  CONCAT: 8,
  PLUS: 9,
  MULTI: 10,
  UNARY: 11,
  POWER: 12,
};

const list_seq = (rule, separator, trailing_separator = false) =>
  trailing_separator
    ? seq(rule, repeat(seq(separator, rule)), optional(separator))
    : seq(rule, repeat(seq(separator, rule)));

const name_list = ($) => list_seq(choice(
  field('name', $.identifier),
  seq(
    field('name', $.identifier),
    '=',
    field('default', $.literal)
  )
), ',');

module.exports = grammar({
  name: 'miniscript',

  precedences: ($) => [
    [$.arguments, $.statement_arguments],
    [
      $.empty_statement,
      $.break_statement,
      $.continue_statement,
      $.while_statement,
      $.if_statement_shorthand,
      $.if_statement,
      $.for_statement,
      $.assignment_statement
    ],
    [
      $.null,
      $.false,
      $.true,
      $.number,
      $.string,
      $.function_definition,
      $.variable,
      $.function_call,
      $.parenthesized_expression,
      $.map_constructor,
      $.list_constructor,
      $.binary_expression,
      $.unary_expression
    ]
  ],

  conflicts: ($) => [
    [$.if_statement_shorthand],
    [$._parameter_list, $.variable],
    [$.return_statement],
    [$.function_call, $.function_statement_call],
    [$.expression, $.literal],
    [$.function_statement_call, $.slice_expression, $.bracket_index_expression]
  ],

  extras: ($) => [$.comment, /\s/],

  supertypes: ($) => [$.statement, $.expression, $.variable],

  word: ($) => $.identifier,

  externals: $ => [
    $._command,
    $._assignment
  ],

  rules: {
    chunk: ($) =>
      repeat($.statement),

    statement: ($) =>
      choice(
        $.empty_statement,
        $.break_statement,
        $.continue_statement,
        $.while_statement,
        $.if_statement_shorthand,
        $.if_statement,
        $.for_statement,
        $.assignment_statement,
        $.function_statement_call,
      ),

    return_statement: ($) =>
      seq(
        'return',
        optional($.expression),
        optional(';')
      ),

    empty_statement: (_) => ';',

    assignment_statement: ($) =>
      seq(
        field('left', $.variable),
        $._assignment,
        field('right', choice($.expression, $.function_definition))
      ),

    break_statement: (_) => 'break',
    continue_statement: (_) => 'continue',

    while_statement: ($) =>
      seq(
        'while',
        field('condition', $.expression),
        repeat($.statement),
        'end',
        'while'
      ),

    if_statement_shorthand: ($) =>
      choice(
        seq(
          'if',
          field('condition', $.expression),
          'then',
          field('consequence', choice($.expression, $.return_statement))
        ),
        seq(
          'if',
          field('condition', $.expression),
          'then',
          field('consequence', choice($.expression, $.return_statement)),
          'else',
          field('alternative', choice($.expression, $.return_statement))
        ),
      ),
    if_statement: ($) =>
      seq(
        'if',
        field('condition', $.expression),
        'then',
        field('consequence', repeat($.statement)),
        repeat(field('alternative', $.elseif_statement)),
        optional(field('alternative', $.else_statement)),
        'end',
        'if'
      ),
    elseif_statement: ($) =>
      seq(
        'else if',
        field('condition', $.expression),
        'then',
        field('consequence', repeat($.statement))
      ),
    else_statement: ($) => seq('else', field('body', repeat($.statement))),

    for_statement: ($) =>
      seq(
        'for',
        field('clause', $.for_generic_clause),
        field('body', repeat($.statement)),
        'end',
        'for'
      ),
    for_generic_clause: ($) =>
      seq(
        $.identifier,
        'in',
        $.expression
      ),

    function_statement_call: ($) =>
      choice(
        seq(
          field('name', $._prefix_expression),
          field('arguments', $.statement_arguments)
        ),
        field('name', $._prefix_expression)
      ),
    statement_arguments: ($) =>
      choice(
        seq('(', optional(list_seq($.expression, ',')), ')'),
        seq($._command, list_seq($.expression, ',')),
      ),

    expression: ($) =>
      choice(
        $.null,
        $.false,
        $.true,
        $.number,
        $.string,
        $.variable,
        $.function_call,
        $.parenthesized_expression,
        $.map_constructor,
        $.list_constructor,
        $.binary_expression,
        $.unary_expression
      ),

    literal: ($) =>
      choice($.null, $.false, $.true, $.number, $.string),

    null: (_) => 'null',
    false: (_) => 'false',
    true: (_) => 'true',

    // Numeral
    number: (_) => {
      function number_literal(digits, exponent_marker, exponent_digits) {
        return choice(
          seq(digits, /U?LL/i),
          seq(
            choice(
              seq(optional(digits), optional('.'), digits),
              seq(digits, optional('.'), optional(digits))
            ),
            optional(
              seq(
                choice(
                  exponent_marker.toLowerCase(),
                  exponent_marker.toUpperCase()
                ),
                seq(optional(choice('-', '+')), exponent_digits)
              )
            ),
            optional(choice('i', 'I'))
          )
        );
      }

      const decimal_digits = /[0-9]+/;
      const decimal_literal = number_literal(
        decimal_digits,
        'e',
        decimal_digits
      );

      return token(decimal_literal);
    },

    // LiteralString
    string: ($) => $._quote_string,

    _quote_string: ($) =>
      choice(
        seq(
          field('start', alias('"', '"')),
          field(
            'content',
            optional(alias($._doublequote_string_content, $.string_content))
          ),
          field('end', alias('"', '"'))
        ),
      ),

    _doublequote_string_content: ($) =>
      repeat1(choice(token.immediate(prec(1, /[^"]+/)), $.escape_sequence)),

    escape_sequence: () =>
      token.immediate(
        '""'
      ),

    function_definition: ($) =>
      seq(
        token('function'),
        field('parameters', optional($.parameters)),
        field('body', repeat($.statement)),
        token('end function')
      ),
    parameters: ($) => seq('(', optional($._parameter_list), ')'),
    _parameter_list: ($) => name_list($),

    _prefix_expression: ($) =>
      prec(1, choice(
        $.variable,
        $.function_call,
        $.parenthesized_expression,
        $.literal,
        $.map_constructor,
        $.list_constructor,
      )),

    variable: ($) =>
      choice(
        $.identifier,
        $.bracket_index_expression,
        $.dot_index_expression,
        $.slice_expression
      ),
    slice_expression: ($) =>
      seq(
        field('map', $._prefix_expression),
        '[',
        field('left', $.expression),
        ':',
        field('right', $.expression),
        ']'
      ),
    bracket_index_expression: ($) =>
      seq(
        field('map', $._prefix_expression),
        '[',
        field('field', $.expression),
        ']'
      ),
    dot_index_expression: ($) =>
      seq(
        field('map', $._prefix_expression),
        '.',
        field('field', $.identifier)
      ),

    function_call: ($) =>
      seq(
        field('name', $._prefix_expression),
        field('arguments', $.arguments)
      ),
    arguments: ($) =>
      seq('(', optional(list_seq($.expression, ',')), ')'),

    parenthesized_expression: ($) => seq('(', $.expression, ')'),

    map_constructor: ($) => seq('{', optional($._field_list), '}'),
    _field_list: ($) => list_seq($.field, $._field_sep, true),
    _field_sep: (_) => choice(',', ';'),
    field: ($) =>
      seq(field('name', $.identifier), ':', field('value', $.expression)),

    list_constructor: ($) => seq('[', optional($._expression_list), ']'),
    _expression_list: ($) => list_seq($.expression, ',', true),

    binary_expression: ($) =>
      choice(
        ...[
          ['or', PREC.OR],
          ['and', PREC.AND],
          ['isa', PREC.AND],
          ['<', PREC.COMPARE],
          ['<=', PREC.COMPARE],
          ['==', PREC.COMPARE],
          ['!=', PREC.COMPARE],
          ['>=', PREC.COMPARE],
          ['>', PREC.COMPARE],
          ['+', PREC.PLUS],
          ['-', PREC.PLUS],
          ['*', PREC.MULTI],
          ['/', PREC.MULTI],
          ['%', PREC.MULTI],
        ].map(([operator, precedence]) =>
          prec.left(
            precedence,
            seq(
              field('left', $.expression),
              operator,
              field('right', $.expression)
            )
          )
        ),
      ),

    unary_expression: ($) =>
      prec.left(
        PREC.UNARY,
        seq(choice('not', '@', '-', '+'), field('operand', $.expression))
      ),

    identifier: (_) => {
      const identifier_start =
        /[^\p{Control}\s+\-*/%^#&~|<>=(){}\[\];:,.\\'"\d]/;
      const identifier_continue =
        /[^\p{Control}\s+\-*/%^#&~|<>=(){}\[\];:,.\\'"]*/;
      return token(seq(identifier_start, identifier_continue));
    },

    comment: ($) =>
      seq(
        field('start', '//'),
        field('content', alias(/[^\r\n]*/, $.comment_content))
      ),
  },
});