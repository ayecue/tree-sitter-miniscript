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

  extras: ($) => [
    $.comment, /\s/, /\t/, /\r/, /\f/
  ],

  word: ($) => $.identifier,

  externals: $ => [
    $._command,
    $.assignment_operator,
    $._eof
  ],

  rules: {
    chunk: ($) =>
      repeat($._statement),

    block: ($) =>
      repeat1($._statement),

    _statement: ($) =>
      choice(
        $._control_flow_statement_shorthand,
        $._control_flow_statement,
        $.expression_statement,
        $._eos
      ),
    
    // Control flow statements
    _control_flow_statement: ($) => 
      seq(
        choice(
          $.break_statement,
          $.continue_statement,
          $.while_statement,
          $.if_statement,
          $.for_statement,
          $.return_statement,
          $.assignment_statement,
          $.function_statement_call
        ),
        $._end_of_statement
      ),

    return_statement: ($) =>
      prec.left(
        0,
        seq(
          token('return'),
          optional($.expression)
        )
      ),
    
    break_statement: (_) => token('break'),
    continue_statement: (_) => token('continue'),

    while_statement: ($) =>
      seq(
        token('while'),
        field('condition', $.expression),
        $._end_of_statement,
        field('body', optional($.block)),
        token('end while')
      ),
    
    assignment_statement: ($) =>
      seq(
        field('left', $.expression),
        field('operator', $.assignment_operator),
        field('right', choice($.expression, $.function_definition))
      ),
    
    _end_of_statement: ($) =>
        choice(
          $._eol,
          $._eos,
          $._eof
      ),
    
    if_statement: ($) =>
      seq(
        token('if'),
        field('condition', $.expression),
        token('then'),
        $._end_of_statement,
        field('body', optional($.block)),
        repeat(field('alternative', $.elseif_statement)),
        optional(field('alternative', $.else_statement)),
        token('end if')
      ),
    elseif_statement: ($) =>
      seq(
        token('else if'),
        field('condition', $.expression),
        token('then'),
        $._end_of_statement,
        field('body', optional($.block))
      ),
    else_statement: ($) =>
      seq(
        token('else'),
        $._end_of_statement,
        field('body', optional($.block))
      ),

    for_statement: ($) =>
      seq(
        token('for'),
        field('variable', $.identifier),
        token('in'),
        field('iterable', $.expression),
        $._end_of_statement,
        field('body', optional($.block)),
        token('end for')
      ),

    function_statement_call: ($) =>
      prec.left(2,
        choice(
          seq(
            field('name', $.variable),
            field('arguments', $._statement_arguments)
          ),
          field('name', $.variable)
        )
      ),
    _statement_arguments: ($) =>
      choice(
        $._arguments_seq,
        seq($._command, list_seq($.expression, ',')),
      ),
    
    // Control flow statement shorthand
    _control_flow_statement_shorthand: ($) => 
      seq(
        $.if_statement_shorthand,
        $._end_of_statement
      ),

    if_statement_shorthand: ($) =>
      choice(
        seq(
          token('if'),
          field('condition', $.expression),
          token('then'),
          field('body', $._if_consequence),
        ),
        seq(
          token('if'),
          field('condition', $.expression),
          token('then'),
          field('body', $._if_consequence),
          token('else'),
          field('body', $._if_consequence)
        ),
      ),
    _if_consequence: ($) =>
      choice(
        $.break_statement,
        $.continue_statement,
        $.return_statement,
        $.assignment_statement,
        $.function_statement_call,
        $.expression
      ),
    
    // Control flow statement expression
    expression_statement: ($) =>
      seq(
        choice(
          $.literal,
          $.map_constructor,
          $.list_constructor,
          $.binary_expression,
          $.unary_expression
        ),
        $._end_of_statement
      ),

    // Expressions
    expression: ($) =>
      choice(
        $.literal,
        $.variable,
        $.function_call,
        $.parenthesized_expression,
        $.map_constructor,
        $.list_constructor,
        $.binary_expression,
        $.unary_expression
      ),

    literal: ($) =>
      choice(
        $.null,
        $.false,
        $.true,
        $.number,
        $.string
      ),

    // Default literals
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

    // String
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
      repeat1(choice(token.immediate(prec(1, /[^"]+/)), $._escape_sequence)),
    _escape_sequence: () =>
      token.immediate(
        '""'
      ),

    // Function definition
    function_definition: ($) =>
      seq(
        token('function'),
        field('parameters', optional($.parameters)),
        field('body', optional($.block)),
        token('end function')
      ),
    parameters: ($) => seq('(', optional($._parameter_list), ')'),
    _parameter_list: ($) => prec(1, name_list($)),

    // Used for member expressions and function calls
    _prefix_expression: ($) =>
      prec(1, choice(
        $.variable,
        $.function_call,
        $.parenthesized_expression,
        $.literal,
        $.map_constructor,
        $.list_constructor,
        $.function_call,
      )),

    // Includes variables, member expressions, and index expressions
    variable: ($) =>
      choice(
        $.identifier,
        $.bracket_index_expression,
        $.dot_index_expression,
        $.slice_expression
      ),
    
    slice_expression: ($) =>
      seq(
        field('entity', $._prefix_expression),
        field('property', $.slice_expression_property)
      ),
    slice_expression_property: ($) =>
      seq(
        '[',
        field('left', optional($.expression)),
        ':',
        field('right', optional($.expression)),
        ']'
      ),
    
    bracket_index_expression: ($) =>
      seq(
        field('entity', $._prefix_expression),
        '[',
        field('property', $.expression),
        ']'
      ),
    
    dot_index_expression: ($) =>
      seq(
        field('entity', $._prefix_expression),
        '.',
        field('property', $.identifier)
      ),

    // Function call expression
    function_call: ($) =>
      seq(
        field('name', $._prefix_expression),
        field('arguments', $._arguments_seq)
      ),

    parenthesized_expression: ($) => seq('(', $.expression, ')'),

    // Map constructor expression
    map_constructor: ($) => seq('{', optional($._field_list), '}'),
    _field_list: ($) => list_seq($.field, $._field_sep, true),
    _field_sep: (_) => choice(',', ';'),
    field: ($) =>
      seq(field('name', $._fieldKey), ':', field('value', $.expression)),
    _fieldKey: ($) => choice($.identifier, $.string),

    // List constructor expression
    list_constructor: ($) => seq('[', optional($._expression_list), ']'),
    _expression_list: ($) => list_seq($.expression, ',', true),

    // Binary expression
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

    // Unary expression
    unary_expression: ($) =>
      prec.left(
        PREC.UNARY,
        seq(choice('not', '@', '-', '+', 'new'), field('operand', $.expression))
      ),

    // Identifier pattern
    identifier: (_) => {
      const identifier_start =
        /[^\p{Control}\s+\-*/%^#&~|<>=(){}\[\];:,.\\'"\d@]/;
      const identifier_continue =
        /[^\p{Control}\s+\-*/%^#&~|<>=(){}\[\];:,.\\'"@]*/;
      return token(seq(identifier_start, identifier_continue));
    },

    // Comment pattern
    comment: ($) =>
      seq(
        field('start', '//'),
        field('content', alias(/[^\r\n]*/, $.comment_content))
      ),
    
    // Internals
    _arguments_seq: ($) => seq('(', optional(list_seq($.expression, ',')), ')'), // Arguments sequence
    _eol: (_) => token('\n'), // end of line
    _eos: (_) => token(';'), // end of statement
  },
});