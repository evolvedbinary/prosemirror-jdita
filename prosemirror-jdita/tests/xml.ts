export function node(name: string, attrs: Record<string, string> = {}, content: string = ''): string {
  return `<${name} ${Object.keys(attrs).map(attr => attr + '="' + attrs[attr] + '"').join(' ')}>${content}</${name}>`;
}

export function topic(attrs: Record<string, string> = {}, content: string = ''): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE topic PUBLIC "-//OASIS//DTD LIGHTWEIGHT DITA Topic//EN" "lw-topic.dtd">` + node('topic', attrs, content);
}

export function title(attrs: Record<string, string> = {}, content: string = ''): string {
  return topic({}, node('title', attrs, content))
}