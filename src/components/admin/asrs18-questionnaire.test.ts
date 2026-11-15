import { describe, expect, test } from 'bun:test';
import { asrs18Options, asrs18Questions, formatAsrs18Responses } from './asrs18-questionnaire';

describe('questionário ASRS-18', () => {
  test('mantém nove itens em cada parte e cinco frequências', () => {
    expect(asrs18Questions.filter((question) => question.part === 'A')).toHaveLength(9);
    expect(asrs18Questions.filter((question) => question.part === 'B')).toHaveLength(9);
    expect(asrs18Options).toEqual(['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Muito frequentemente']);
  });

  test('formata respostas registradas para inclusão no laudo sem interpretação automática', () => {
    const output = formatAsrs18Responses(JSON.stringify({ 0: 0, 9: 4 }));
    expect(output).toContain('Parte A — Desatenção');
    expect(output).toContain('1. Com que frequência você comete erros por falta de atenção');
    expect(output).toContain('— Nunca');
    expect(output).toContain('Parte B — Hiperatividade/Impulsividade');
    expect(output).toContain('10. Com que frequência você fica se mexendo');
    expect(output).toContain('— Muito frequentemente');
    expect(output).toContain('sem cálculo ou interpretação automática');
  });
});
