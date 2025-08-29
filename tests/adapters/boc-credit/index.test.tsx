
import { vi, beforeEach, test, describe, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

import { BocCreditAdapter } from '../../../src/adapters/boc-credit';
import p1p1TextItems from './pdf1/p1.json';
import p1p2TextItems from './pdf1/p2.json';
import p1p3TextItems from './pdf1/p3.json';

const pdf1 = [p1p1TextItems, p1p2TextItems, p1p3TextItems];

import p2p1TextItems from './pdf2/p1.json';
import p2p2TextItems from './pdf2/p2.json';
import p2p3TextItems from './pdf2/p3.json';
import p2p4TextItems from './pdf2/p4.json';
import p2p5TextItems from './pdf2/p5.json';
import p2p6TextItems from './pdf2/p6.json';
import p2p7TextItems from './pdf2/p7.json';
import p2p8TextItems from './pdf2/p8.json';
const pdf2 = [p2p1TextItems, p2p2TextItems, p2p3TextItems, p2p4TextItems, p2p5TextItems, p2p6TextItems, p2p7TextItems, p2p8TextItems];

import p3p1TextItems from './pdf3/p1.json';
import p3p2TextItems from './pdf3/p2.json';
import p3p3TextItems from './pdf3/p3.json';

const pdf3 = [p3p1TextItems, p3p2TextItems, p3p3TextItems];

import p4p1TextItems from './pdf4/p1.json';
import p4p2TextItems from './pdf4/p2.json';
import p4p3TextItems from './pdf4/p3.json';
import p4p4TextItems from './pdf4/p4.json';
import p4p5TextItems from './pdf4/p5.json';
import p4p6TextItems from './pdf4/p6.json';
import p4p7TextItems from './pdf4/p7.json';
import p4p8TextItems from './pdf4/p8.json';
import p4p9TextItems from './pdf4/p9.json';
import p4p10TextItems from './pdf4/p10.json';
const pdf4 = [p4p1TextItems, p4p2TextItems, p4p3TextItems, p4p4TextItems, p4p5TextItems, p4p6TextItems, p4p7TextItems, p4p8TextItems, p4p9TextItems, p4p10TextItems];

import resultCsvText1 from './result1.csv?raw';
import resultCsvText2 from './result2.csv?raw';
import resultCsvText3 from './result3.csv?raw';
import resultCsvText4 from './result4.csv?raw';


// vi.mock 是被提升的(hoisted)，这意味着它会在导入模块之前执行
// 为了避免测试之间的相互干扰，我们需要使用 vi.doMock 和 vi.resetModules 来隔离每个测试

describe('adapter for boc debit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test('converter with pdf1', async () => {
    // 使用 doMock 替代 mock，这样它不会被提升
    vi.doMock('pdfjs-dist', () => ({
      getDocument: vi.fn(() => ({
        promise: Promise.resolve({
          numPages: pdf1.length,
          getPage: (pageNum: number) => ({
            getTextContent: () => Promise.resolve({
              items: pdf1[pageNum - 1] || null,
            })
          })
        })
      }))
    }));

    // 重新导入适配器以确保它使用新的模拟
    const { BocCreditAdapter } = await import('../../../src/adapters/boc-credit');

    const mockFile = new File([], 'boc_credit1.pdf');
    const csvText1 = await BocCreditAdapter.converter(mockFile);
    fs.writeFileSync('./pdf1.csv', csvText1, 'utf-8');


    expect(csvText1).toEqual(resultCsvText1);
  });

  test('converter with pdf2', async () => {
    vi.doMock('pdfjs-dist', () => ({
      getDocument: vi.fn(() => ({
        promise: Promise.resolve({
          numPages: pdf2.length,
          getPage: (pageNum: number) => ({
            getTextContent: () => Promise.resolve({
              items: pdf2[pageNum - 1] || null,
            })
          })
        })
      }))
    }));

    const { BocCreditAdapter } = await import('../../../src/adapters/boc-credit');

    const mockFile = new File([], 'boc_credit2.pdf');
    const csvText2 = await BocCreditAdapter.converter(mockFile);
    fs.writeFileSync('./pdf2.csv', csvText2, 'utf-8');
    expect(csvText2).toEqual(resultCsvText2);
  });

  test('converter with pdf3', async () => {
    vi.doMock('pdfjs-dist', () => ({
      getDocument: vi.fn(() => ({
        promise: Promise.resolve({
          numPages: pdf3.length,
          getPage: (pageNum: number) => ({
            getTextContent: () => Promise.resolve({
              items: pdf3[pageNum - 1] || null,
            })
          })
        })
      }))
    }));

    const { BocCreditAdapter } = await import('../../../src/adapters/boc-credit');

    const mockFile = new File([], 'boc_credit3.pdf');
    const csvText3 = await BocCreditAdapter.converter(mockFile);
    fs.writeFileSync('./pdf3.csv', csvText3, 'utf-8');
    expect(csvText3).toEqual(resultCsvText3);
  });

  test('converter with pdf4', async () => {
    vi.doMock('pdfjs-dist', () => ({
      getDocument: vi.fn(() => ({
        promise: Promise.resolve({
          numPages: pdf4.length,
          getPage: (pageNum: number) => ({
            getTextContent: () => Promise.resolve({
              items: pdf4[pageNum - 1] || null,
            })
          })
        })
      }))
    }));

    const { BocCreditAdapter } = await import('../../../src/adapters/boc-credit');

    const mockFile = new File([], 'boc_credit4.pdf');
    const csvText4 = await BocCreditAdapter.converter(mockFile);
    fs.writeFileSync('./pdf4.csv', csvText4, 'utf-8');
    expect(csvText4).toEqual(resultCsvText4);
  });
});
