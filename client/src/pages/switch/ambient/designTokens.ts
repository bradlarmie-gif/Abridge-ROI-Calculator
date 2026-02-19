export const DS = {
  bg: '#F7F6F4',
  black: '#0F0F0F',
  body: '#525252',
  muted: '#A3A3A3',
  border: '#E8E8E8',
  red: '#EA2C00',
  redHover: '#C72300',
  redActive: '#A81F00',
  white: '#FFFFFF',
  hoverBg: '#F5F5F4',
  maxWidth: 640,
  font: 'Manrope, sans-serif',
  radius: { card: 14, input: 10, pill: 999 },
  shadow: '0 2px 8px rgba(0,0,0,0.08)',
} as const;

export const cardStyle: React.CSSProperties = {
  backgroundColor: DS.white,
  border: `1px solid ${DS.border}`,
  borderRadius: DS.radius.card,
  padding: '28px 32px',
};

export const featuredCardStyle: React.CSSProperties = {
  backgroundColor: DS.white,
  borderTop: `1px solid ${DS.border}`,
  borderRight: `1px solid ${DS.border}`,
  borderBottom: `1px solid ${DS.border}`,
  borderLeft: `5px solid ${DS.red}`,
  borderRadius: DS.radius.card,
  padding: '28px 28px 28px 23px',
  boxShadow: DS.shadow,
};

export const labelStyle: React.CSSProperties = {
  fontFamily: DS.font,
  fontWeight: 600,
  fontSize: 11,
  color: DS.muted,
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
};

export const headlineStyle: React.CSSProperties = {
  fontFamily: DS.font,
  fontWeight: 700,
  fontSize: 44,
  color: DS.black,
  lineHeight: 1.15,
};

export const headlineMobileStyle: React.CSSProperties = {
  ...headlineStyle,
  fontSize: 32,
};

export const bodyStyle: React.CSSProperties = {
  fontFamily: DS.font,
  fontWeight: 400,
  fontSize: 17,
  color: DS.body,
  lineHeight: 1.75,
};

export const inputLabelStyle: React.CSSProperties = {
  fontFamily: DS.font,
  fontWeight: 600,
  fontSize: 13,
  color: DS.body,
};

export const inputFieldStyle: React.CSSProperties = {
  fontFamily: DS.font,
  fontWeight: 600,
  fontSize: 18,
  color: DS.black,
  backgroundColor: DS.white,
  border: `1.5px solid ${DS.border}`,
  borderRadius: DS.radius.input,
  padding: '14px 18px',
  width: '100%',
  outline: 'none',
  transition: 'border-color 150ms ease',
};

export const footnoteStyle: React.CSSProperties = {
  fontFamily: DS.font,
  fontWeight: 400,
  fontSize: 13,
  color: DS.muted,
  fontStyle: 'italic',
};

export const primaryButtonStyle = (enabled = true): React.CSSProperties => ({
  fontFamily: DS.font,
  fontWeight: 600,
  fontSize: 15,
  padding: '15px 36px',
  borderRadius: DS.radius.input,
  backgroundColor: enabled ? DS.red : DS.border,
  color: enabled ? DS.white : DS.muted,
  border: 'none',
  cursor: enabled ? 'pointer' : 'not-allowed',
  transition: 'background 150ms ease',
});

export const secondaryButtonStyle: React.CSSProperties = {
  fontFamily: DS.font,
  fontWeight: 500,
  fontSize: 15,
  padding: '13px 28px',
  borderRadius: DS.radius.input,
  backgroundColor: 'transparent',
  color: DS.black,
  border: `1.5px solid ${DS.black}`,
  cursor: 'pointer',
  transition: 'background 150ms ease',
};

export const backLinkStyle: React.CSSProperties = {
  fontSize: 15,
  color: DS.body,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  fontFamily: DS.font,
  fontWeight: 500,
};

export const fontStyles = {
  display: (mobile = false): React.CSSProperties => ({
    fontFamily: DS.font,
    fontWeight: 700,
    fontSize: mobile ? 32 : 44,
    color: DS.black,
    lineHeight: 1.15,
  }),
  title: (mobile = false): React.CSSProperties => ({
    fontFamily: DS.font,
    fontWeight: 600,
    fontSize: mobile ? 20 : 24,
    color: DS.black,
    lineHeight: 1.3,
  }),
  body: (): React.CSSProperties => ({
    fontFamily: DS.font,
    fontWeight: 400,
    fontSize: 17,
    color: DS.body,
    lineHeight: 1.75,
  }),
  label: (): React.CSSProperties => ({
    fontFamily: DS.font,
    fontWeight: 600,
    fontSize: 11,
    color: DS.muted,
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
  }),
  dataLarge: (): React.CSSProperties => ({
    fontFamily: DS.font,
    fontWeight: 700,
    fontSize: 72,
    color: DS.black,
    lineHeight: 1,
  }),
  dataMedium: (color = DS.black): React.CSSProperties => ({
    fontFamily: DS.font,
    fontWeight: 700,
    fontSize: 36,
    color,
    lineHeight: 1,
  }),
  dataSmall: (): React.CSSProperties => ({
    fontFamily: DS.font,
    fontWeight: 600,
    fontSize: 20,
    color: DS.black,
    lineHeight: 1.3,
  }),
  footnote: (): React.CSSProperties => ({
    fontFamily: DS.font,
    fontWeight: 400,
    fontSize: 13,
    color: DS.muted,
    lineHeight: 1.6,
  }),
} as const;
