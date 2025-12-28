// Cores do tema
export const COLORS = {
  primary: [249, 115, 22], // Laranja
  white: [255, 255, 255],
  dark: [0, 0, 0],
  gray: [100, 100, 100],
  lightGray: [71, 85, 105],
  bgCard: [248, 250, 252],
  border: [226, 232, 240],
  alternateRow: [255, 247, 237]
};

// Configurações do cabeçalho
export const HEADER_CONFIG = {
  height: 40,
  logoPosition: { x: 12, y: 10, width: 25, height: 20 },
  separatorLine: { x1: 50, y1: 10, x2: 50, y2: 30 }
};

// Configurações dos cards
export const CARD_CONFIG = {
  width: 45,
  height: 22,
  spacing: 5,
  radius: 3
};

// Estilos de tabela padrão
export const TABLE_STYLES = {
  headStyles: {
    fillColor: COLORS.primary,
    textColor: COLORS.white,
    fontStyle: 'bold',
    halign: 'center',
    font: 'helvetica',
    fontSize: 8
  },
  footStyles: {
    fillColor: COLORS.border,
    textColor: COLORS.primary,
    fontStyle: 'bold',
    font: 'helvetica'
  },
  alternateRowStyles: {
    fillColor: COLORS.alternateRow
  },
  styles: {
    font: 'helvetica',
    fontSize: 7,
    cellPadding: 2
  }
};

// Configurações de fonte
export const FONT_SIZES = {
  title: 18,
  subtitle: 11,
  cardLabel: 8,
  cardValue: 16,
  body: 8,
  footer: 8
};
