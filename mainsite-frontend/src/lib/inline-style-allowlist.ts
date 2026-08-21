/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
/**
 * Allowlist de propriedades CSS para o atributo `style` do conteúdo
 * sanitizado (issue #411). DOMPurify com `ADD_ATTR: ['style']` preserva o
 * atributo com QUALQUER valor — este passo, aplicado no pós-processamento
 * DOM que já existe nos dois call sites (PostReader e AboutPage), reescreve
 * cada `style` mantendo apenas as propriedades que o TipTap do admin emite
 * (rationale do diferimento na v03.22.00: TextIndent, TextAlign,
 * EditorSpacing, FontFamily, FontSize, Color e width:% de imagem), com o
 * VALOR validado — em vez de remover o atributo e regredir o conteúdo
 * publicado.
 *
 * O CSSOM do browser já parseou o valor quando lemos `el.style` (shorthands
 * como `margin:` aparecem expandidos nas quatro longhands), então não há
 * parsing manual de string — truques de escaping morrem no parser nativo.
 */

const LENGTH_VALUE = /^-?\d+(?:\.\d+)?(?:px|rem|em|%)$/i;
const COLOR_VALUE = /^(?:#[0-9a-f]{3,8}|rgba?\(\s*[\d.,\s%]+\)|hsla?\(\s*[\d.,\s%deg]+\)|[a-z]+)$/i;
// Nomes de fonte: letras/números/espaços/vírgulas/aspas/hífens — sem
// parênteses, o que exclui url(...)/expression(...) por construção.
const FONT_FAMILY_VALUE = /^[\w\s,'"-]+$/;

const ALLOWED_STYLE_PROPERTIES: Record<string, RegExp> = {
  'text-align': /^(?:left|right|center|justify)$/i,
  'text-indent': LENGTH_VALUE,
  'font-family': FONT_FAMILY_VALUE,
  'font-size': LENGTH_VALUE,
  color: COLOR_VALUE,
  width: LENGTH_VALUE,
  'margin-top': LENGTH_VALUE,
  'margin-right': LENGTH_VALUE,
  'margin-bottom': LENGTH_VALUE,
  'margin-left': LENGTH_VALUE,
};

/**
 * Reescreve o `style` de cada elemento sob `root`, mantendo apenas
 * propriedades da allowlist cujo valor passa na validação. Elementos sem
 * nenhuma propriedade sobrevivente perdem o atributo por inteiro.
 */
export function enforceInlineStyleAllowlist(root: HTMLElement): void {
  for (const el of root.querySelectorAll<HTMLElement>('[style]')) {
    const kept: Array<[property: string, value: string]> = [];
    for (let index = 0; index < el.style.length; index += 1) {
      const property = el.style.item(index);
      const rule = ALLOWED_STYLE_PROPERTIES[property];
      if (!rule) continue;
      const value = el.style.getPropertyValue(property).trim();
      if (rule.test(value)) kept.push([property, value]);
    }
    el.removeAttribute('style');
    for (const [property, value] of kept) {
      el.style.setProperty(property, value);
    }
  }
}
