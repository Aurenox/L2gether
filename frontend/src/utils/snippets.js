// Emmet expansion and language-specific snippet suggestions

export function expandEmmetAbbreviation(abbr) {
  const trimmed = abbr.trim();
  if (trimmed === '!') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  
</body>
</html>`;
  }

  // ul>li*3
  const multMatch = trimmed.match(/^([a-z0-9_-]+)>([a-z0-9_-]+)\*(\d+)$/i);
  if (multMatch) {
    const parent = multMatch[1];
    const child = multMatch[2];
    const count = parseInt(multMatch[3], 10);
    const children = Array.from({ length: count }, () => `  <${child}></${child}>`).join('\n');
    return `<${parent}>\n${children}\n</${parent}>`;
  }

  // div.className or tag.className
  const classMatch = trimmed.match(/^([a-z0-9_-]*)\.([a-z0-9_-]+)$/i);
  if (classMatch) {
    const tag = classMatch[1] || 'div';
    const className = classMatch[2];
    return `<${tag} class="${className}"></${tag}>`;
  }

  // div#idName or tag#idName
  const idMatch = trimmed.match(/^([a-z0-9_-]*)#([a-z0-9_-]+)$/i);
  if (idMatch) {
    const tag = idMatch[1] || 'div';
    const idName = idMatch[2];
    return `<${tag} id="${idName}"></${tag}>`;
  }

  // Common tags
  const simpleTags = {
    h1: '<h1></h1>',
    h2: '<h2></h2>',
    h3: '<h3></h3>',
    h4: '<h4></h4>',
    p: '<p></p>',
    div: '<div></div>',
    span: '<span></span>',
    button: '<button></button>',
    a: '<a href=""></a>',
    img: '<img src="" alt="" />',
    input: '<input type="text" />',
    form: '<form action="" method="post">\n  \n</form>',
    ul: '<ul>\n  <li></li>\n</ul>',
    ol: '<ol>\n  <li></li>\n</ol>',
    table: '<table>\n  <thead>\n    <tr><th></th></tr>\n  </thead>\n  <tbody>\n    <tr><td></td></tr>\n  </tbody>\n</table>',
    section: '<section></section>',
    main: '<main></main>',
    header: '<header></header>',
    footer: '<footer></footer>',
    nav: '<nav></nav>'
  };

  return simpleTags[trimmed] || null;
}

export const LANGUAGE_SNIPPETS = {
  javascript: [
    { label: 'pri', snippet: 'console.log($1);', detail: 'console.log output statement' },
    { label: 'log', snippet: 'console.log($1);', detail: 'console.log output statement' },
    { label: 'clg', snippet: 'console.log("$1:", $1);', detail: 'console.log with label' },
    { label: 'fn', snippet: 'function $1($2) {\n  $3\n}', detail: 'Function declaration' },
    { label: 'afn', snippet: 'const $1 = ($2) => {\n  $3\n};', detail: 'Arrow function' },
    { label: 'trycatch', snippet: 'try {\n  $1\n} catch (error) {\n  console.error(error);\n}', detail: 'Try-catch block' }
  ],
  python: [
    { label: 'pri', snippet: 'print($1)', detail: 'print() function' },
    { label: 'print', snippet: 'print($1)', detail: 'print() function' },
    { label: 'def', snippet: 'def $1($2):\n    $3', detail: 'Function definition' },
    { label: 'main', snippet: 'if __name__ == "__main__":\n    $1', detail: 'Main entry point' },
    { label: 'class', snippet: 'class $1:\n    def __init__(self$2):\n        $3', detail: 'Class declaration' }
  ],
  c: [
    { label: 'pri', snippet: 'printf("$1\\n"$2);', detail: 'printf statement' },
    { label: 'main', snippet: 'int main(int argc, char *argv[]) {\n    $1\n    return 0;\n}', detail: 'C main entry point' },
    { label: 'inc', snippet: '#include <stdio.h>\n#include <stdlib.h>', detail: 'Standard includes' },
    { label: 'for', snippet: 'for (int i = 0; i < $1; i++) {\n    $2\n}', detail: 'Standard for loop' }
  ],
  react: [
    { label: 'rfc', snippet: 'import React from \'react\';\n\nexport default function $1() {\n  return (\n    <div>\n      $2\n    </div>\n  );\n}', detail: 'React Functional Component' },
    { label: 'state', snippet: 'const [$1, set$2] = useState($3);', detail: 'useState Hook' },
    { label: 'effect', snippet: 'useEffect(() => {\n  $1\n}, [$2]);', detail: 'useEffect Hook' }
  ]
};

export default { expandEmmetAbbreviation, LANGUAGE_SNIPPETS };
