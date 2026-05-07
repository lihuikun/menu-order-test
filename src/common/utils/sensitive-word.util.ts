// 违规检测工具函数
import * as fs from 'fs';

const wordFilePath = 'src/assets/sensitive-words.json';
const sensitiveWords: string[] = JSON.parse(fs.readFileSync(wordFilePath, 'utf-8'));

export function findSensitiveWords(text: string): string[] {
    const hits: string[] = [];
    for (const word of sensitiveWords) {
        if (text.includes(word)) {
            hits.push(word);
        }
    }
    return hits;
}

export function replaceSensitiveWords(text: string): string {
    let result = text;
    for (const word of sensitiveWords) {
        result = result.replace(new RegExp(word, 'g'), '*'.repeat(word.length));
    }
    return result;
}
