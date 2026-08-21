/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { describe, expect, it } from 'vitest';
import { enforceInlineStyleAllowlist } from './inline-style-allowlist';

const applyTo = (html: string): HTMLElement => {
  const root = document.createElement('div');
  root.innerHTML = html;
  enforceInlineStyleAllowlist(root);
  return root;
};

describe('enforceInlineStyleAllowlist', () => {
  it('preserva o conjunto completo de inline styles que o TipTap do admin emite', () => {
    // O rationale do diferimento na v03.22.00: TextIndent, TextAlign,
    // EditorSpacing (margens), FontFamily, FontSize, Color e width:% de
    // imagem "são todos inline styles" — nenhum pode regredir.
    const root = applyTo(
      '<p style="text-indent: 1.5rem; text-align: justify; font-family: Georgia, serif; font-size: 18px; color: #aa3322; margin-top: 2rem; margin-bottom: 1rem;">t</p>' +
        '<img style="width: 45%" src="/a.jpg" alt="a">',
    );
    const p = root.querySelector('p') as HTMLElement;
    expect(p.style.textIndent).toBe('1.5rem');
    expect(p.style.textAlign).toBe('justify');
    expect(p.style.fontFamily).toContain('Georgia');
    expect(p.style.fontSize).toBe('18px');
    expect(p.style.color).not.toBe('');
    expect(p.style.marginTop).toBe('2rem');
    expect(p.style.marginBottom).toBe('1rem');
    const img = root.querySelector('img') as HTMLElement;
    expect(img.style.width).toBe('45%');
  });

  it('expande shorthand margin nas quatro longhands permitidas', () => {
    const root = applyTo('<p style="margin: 1rem 2rem">t</p>');
    const p = root.querySelector('p') as HTMLElement;
    expect(p.style.marginTop).toBe('1rem');
    expect(p.style.marginRight).toBe('2rem');
  });

  it('remove propriedades fora da allowlist mantendo as permitidas do mesmo elemento', () => {
    const root = applyTo(
      '<p style="text-align: center; position: fixed; z-index: 9999; background-image: url(https://tracker.example/x.png)">t</p>',
    );
    const p = root.querySelector('p') as HTMLElement;
    expect(p.style.textAlign).toBe('center');
    expect(p.getAttribute('style')).not.toContain('position');
    expect(p.getAttribute('style')).not.toContain('url(');
    expect(p.getAttribute('style')).not.toContain('z-index');
  });

  it('remove valores maliciosos de propriedades permitidas', () => {
    const root = applyTo('<p style="width: expression(alert(1)); font-family: url(https://evil.example/f)">t</p>');
    const p = root.querySelector('p') as HTMLElement;
    expect(p.getAttribute('style')).toBeNull();
  });

  it('remove o atributo inteiro quando nada sobrevive e não toca elementos sem style', () => {
    const root = applyTo('<p style="float: left">a</p><p>b</p>');
    const [styled, plain] = Array.from(root.querySelectorAll('p'));
    expect(styled.getAttribute('style')).toBeNull();
    expect(plain.getAttribute('style')).toBeNull();
  });
});
