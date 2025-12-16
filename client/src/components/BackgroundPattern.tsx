export function BackgroundPattern() {
  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Ccircle cx='40' cy='30' r='25' fill='%23EDE0D0' fill-opacity='0.12'/%3E%3Ccircle cx='150' cy='50' r='18' fill='%23EDE0D0' fill-opacity='0.10'/%3E%3Ccircle cx='80' cy='120' r='20' fill='%23EDE0D0' fill-opacity='0.11'/%3E%3Ccircle cx='170' cy='140' r='15' fill='%23EDE0D0' fill-opacity='0.09'/%3E%3Crect x='20' y='160' width='30' height='30' rx='6' fill='%23EDE0D0' fill-opacity='0.10'/%3E%3Crect x='120' cy='170' width='25' height='25' rx='5' fill='%23EDE0D0' fill-opacity='0.08'/%3E%3Ccircle cx='60' cy='70' r='12' fill='%23EDE0D0' fill-opacity='0.10'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '200px 200px',
      }}
    />
  );
}
