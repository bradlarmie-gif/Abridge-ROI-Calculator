export function BackgroundShape() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div
        className="absolute inset-0"
        style={{
          background:
            // warm paper base (very subtle)
            "linear-gradient(180deg, #FFFFFF 0%, #FCFCFA 60%, #FBFBF8 100%)," +
            // whisper of coral in one corner (lighter than before)
            "radial-gradient(900px 520px at 10% 12%, rgba(240,51,25,0.028) 0%, rgba(240,51,25,0) 62%)",
        }}
      />
    </div>
  );
}
