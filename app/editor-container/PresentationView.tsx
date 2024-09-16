import 'reveal.js/dist/reveal.css';

import React, { useEffect, useRef, useState } from 'react';
import Reveal from 'reveal.js';
import d from 'reveal.js/dist/theme/black.css';
import Markdown from 'reveal.js/plugin/markdown/markdown.esm.js';

import { fs } from '@bangle.io/workspace-info';

console.log(d);

const PresentationView = ({
  wsPath,
  revealAt,
}: {
  wsPath: string;
  revealAt: number;
}) => {
  const [markdown, setMarkdown] = useState<string | undefined>(undefined);
  const slidesRef = useRef<HTMLDivElement>(null); // Ref for slides div

  useEffect(() => {
    const loadMarkdown = async () => {
      const markdownData = await fs.readFileAsText(wsPath); // Make sure this works correctly
      setMarkdown(markdownData);
    };

    loadMarkdown();
  }, [wsPath, revealAt]);

  useEffect(() => {
    if (markdown && slidesRef.current) {
      // Insert the markdown into a <section> tag within the slides container
      slidesRef.current.innerHTML = `
        <section data-markdown>
          <textarea data-template>${markdown}</textarea>
        </section>
      `;

      let deck = new Reveal({
        plugins: [Markdown],
      });

      deck.initialize();
    }
  }, [markdown]);

  return (
    <div className="reveal reveal-viewport">
      <div className="slides" ref={slidesRef}></div>
    </div>
  );
};

export default PresentationView;
