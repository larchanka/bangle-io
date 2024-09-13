import htmlToPdfmake from 'html-to-pdfmake';
import { marked } from 'marked';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import React from 'react';

import { Button, DownloadIcon } from '@bangle.io/ui-components';
import { fs } from '@bangle.io/workspace-info';
import { removeExtension, resolvePath2 } from '@bangle.io/ws-path';

const MAX_ENTRIES = 1;

pdfMake.vfs = pdfFonts.pdfMake.vfs; // Required for embedding fonts

function cleanEmptyTextNodes(element: any): any {
  // If it's an array, iterate over it and clean each item
  if (Array.isArray(element)) {
    return element.map(cleanEmptyTextNodes).filter((item) => item !== null); // Filter out any null items
  }

  // If it's an object, check for text and nested structures
  if (typeof element === 'object' && element !== null) {
    // Clean text if it exists
    if (element.text) {
      element.text = element.text?.trim ? element.text.trim() : element.text;

      if (element.text === '') {
        return null; // Remove object if text is empty
      }
    }

    // Recursively clean any nested objects or arrays
    for (const key in element) {
      if (element.hasOwnProperty(key)) {
        element[key] = cleanEmptyTextNodes(element[key]);
      }
    }

    // Optionally, check if the object still has any properties left after cleaning
    // If all keys are null, remove the object entirely
    const hasValidKeys = Object.values(element).some((value) => value !== null);

    return hasValidKeys ? element : null;
  }

  // For all other cases (non-object and non-array), return as-is
  return element;
}

const MarkdownToPdf = ({ wsPath }: { wsPath: string }) => {
  const downloadPdf = async () => {
    // Convert HTML to a format that pdfmake understands
    const markdown = await fs.readFileAsText(wsPath);
    const htmlContent = marked(markdown);
    const pdfContent = cleanEmptyTextNodes(htmlToPdfmake(htmlContent));
    const docDefinition = {
      content: pdfContent,
      defaultStyle: {
        lineHeiht: 1,
      },
    };
    let path = removeExtension(resolvePath2(wsPath).filePath);

    if (path.split('/').length > MAX_ENTRIES) {
      let p = path.split('/').slice(-1 * MAX_ENTRIES);
      path = p.join('/');
    }

    // Generate the PDF and trigger a download
    pdfMake.createPdf(docDefinition).download(path + '.pdf');
  };

  return (
    <Button
      size="xs"
      variant="transparent"
      leftIcon={
        <div className="flex items-center">
          <DownloadIcon stroke="grey" />
        </div>
      }
      ariaLabel="Скачать PDF"
      onPress={downloadPdf}
      text="PDF"
    />
  );
};

export default MarkdownToPdf;
