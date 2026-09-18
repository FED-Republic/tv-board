import { describe, expect, it } from 'vitest';
import { sanitizeSummary } from '@/domain/summary';

/** A `<` that opens or closes anything but the six allowed elements. */
const DISALLOWED_TAG = /<(?!\/?(?:p|b|i|em|strong|br)\b)/;

/** Every vector at once, so the two output-wide guarantees are checked on one string. */
const HOSTILE_SUMMARY = [
  '<p class="lede" onclick="evil()">Hi <a href="javascript:alert(1)">link</a></p>',
  '<svg><script>alert(1)</script></svg>',
  '<iframe srcdoc="<p>evil</p>"></iframe>',
  '<template><p>hidden</p></template>',
  '<img src=x onerror=alert(1)>',
  '<p>Tail<br>text</p>',
].join('');

describe('sanitizeSummary', () => {
  describe('when there is nothing to show', () => {
    it('given null, when sanitised, then the result is empty', () => {
      expect(sanitizeSummary(null)).toBe('');
    });

    it('given an empty string, when sanitised, then the result is empty', () => {
      expect(sanitizeSummary('')).toBe('');
    });

    it('given whitespace only, when sanitised, then the result is empty', () => {
      expect(sanitizeSummary('  \n\t  ')).toBe('');
    });
  });

  describe('when the markup only uses allowed elements', () => {
    it('given a TVmaze summary, when sanitised, then it comes back unchanged', () => {
      const summary = '<p><b>Under the Dome</b> is a show.</p>';

      expect(sanitizeSummary(summary)).toBe(summary);
    });

    it('given emphasis elements, when sanitised, then they are kept', () => {
      const summary = '<p><i>a</i><em>b</em><strong>c</strong></p>';

      expect(sanitizeSummary(summary)).toBe(summary);
    });

    it('given a line break, when sanitised, then the break is kept', () => {
      expect(sanitizeSummary('<p>Line<br>two</p>')).toBe('<p>Line<br>two</p>');
    });

    it('given an uppercase tag, when sanitised, then it is normalised to lowercase', () => {
      expect(sanitizeSummary('<P>Hi</P>')).toBe('<p>Hi</p>');
    });
  });

  describe('when an allowed element carries attributes', () => {
    it('given a class and an inline handler, when sanitised, then every attribute is dropped', () => {
      expect(sanitizeSummary('<p class="x" onclick="evil()">Hi</p>')).toBe('<p>Hi</p>');
    });
  });

  describe('when the markup uses a disallowed element', () => {
    it('given a link, when sanitised, then the tag is unwrapped and its text is kept', () => {
      expect(sanitizeSummary('<p>See <a href="https://x">this</a></p>')).toBe('<p>See this</p>');
    });

    it('given a wrapping div, when sanitised, then the paragraph inside survives', () => {
      expect(sanitizeSummary('<div><p>Nested</p></div>')).toBe('<p>Nested</p>');
    });

    it('given a span around allowed markup, when sanitised, then the allowed children survive', () => {
      expect(sanitizeSummary('<div><span>a</span><b>b</b></div>')).toBe('a<b>b</b>');
    });

    it('given bare text, when sanitised, then the text is kept as is', () => {
      expect(sanitizeSummary('Just text')).toBe('Just text');
    });
  });

  describe('when the markup carries active content', () => {
    it('given a script, when sanitised, then the tag and its code are removed', () => {
      expect(sanitizeSummary('<p>Hi<script>alert(1)</script></p>')).toBe('<p>Hi</p>');
    });

    it('given a style block, when sanitised, then the tag and its rules are removed', () => {
      expect(sanitizeSummary('<p>Hi<style>p{color:red}</style></p>')).toBe('<p>Hi</p>');
    });

    it('given an image with an error handler, when sanitised, then nothing is left', () => {
      expect(sanitizeSummary('<img src=x onerror=alert(1)>')).toBe('');
    });

    it('given a link with a javascript url, when sanitised, then only its text survives', () => {
      const summary = '<p>See <a href="javascript:alert(1)">this</a></p>';

      expect(sanitizeSummary(summary)).toBe('<p>See this</p>');
    });

    it('given a script inside an svg, when sanitised, then neither the svg nor the code survives', () => {
      expect(sanitizeSummary('<p>Hi<svg><script>alert(1)</script></svg></p>')).toBe('<p>Hi</p>');
    });

    it('given an svg image with an error handler, when sanitised, then nothing is left', () => {
      expect(sanitizeSummary('<svg><image href=x onerror=alert(1)></svg>')).toBe('');
    });

    it('given an iframe with a srcdoc, when sanitised, then only its fallback text survives', () => {
      const summary = '<p>Hi</p><iframe srcdoc="<p>evil</p>">fallback</iframe>';

      expect(sanitizeSummary(summary)).toBe('<p>Hi</p>fallback');
    });

    it('given a template, when sanitised, then the markup it hides does not survive', () => {
      expect(sanitizeSummary('<template><p>hidden</p></template><p>shown</p>')).toBe(
        '<p>shown</p>',
      );
    });

    it('given a paragraph with a click handler, when sanitised, then only its text survives', () => {
      expect(sanitizeSummary('<p onclick="evil()">Hi</p>')).toBe('<p>Hi</p>');
    });
  });
  describe('when the markup is nested or malformed', () => {
    it('given an unclosed bold, when sanitised, then the parser closes it and the text is kept', () => {
      expect(sanitizeSummary('<p><b>unclosed')).toBe('<p><b>unclosed</b></p>');
    });

    it('given a paragraph two levels deep, when sanitised, then the allowed markup survives', () => {
      const summary = '<div><section><p>Deep <strong>text</strong></p></section></div>';

      expect(sanitizeSummary(summary)).toBe('<p>Deep <strong>text</strong></p>');
    });

    it('given a stray closing tag, when sanitised, then the text around it is kept', () => {
      expect(sanitizeSummary('<p>Hi</span> there</p>')).toBe('<p>Hi there</p>');
    });
  });

  describe('when a node is neither an element nor text', () => {
    it('given an HTML comment, when sanitised, then the comment is dropped', () => {
      expect(sanitizeSummary('<p>Hi<!-- a comment --></p>')).toBe('<p>Hi</p>');
    });

    it('given a CDATA-like node, when sanitised, then it is dropped with its content', () => {
      expect(sanitizeSummary('<![CDATA[alert(1)]]><p>Hi</p>')).toBe('<p>Hi</p>');
    });
  });

  describe('when every vector arrives in one summary', () => {
    it('given the hostile summary, when sanitised, then the readable text is kept', () => {
      expect(sanitizeSummary(HOSTILE_SUMMARY)).toBe('<p>Hi link</p><p>Tail<br>text</p>');
    });

    it('given the hostile summary, when sanitised, then no disallowed tag is left', () => {
      expect(sanitizeSummary(HOSTILE_SUMMARY)).not.toMatch(DISALLOWED_TAG);
    });

    it('given the hostile summary, when sanitised, then no attribute is left', () => {
      expect(sanitizeSummary(HOSTILE_SUMMARY)).not.toContain('=');
    });
  });
});
