export function BackgroundPattern() {
  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'%3E%3C!-- Broken fragment 1 - angular shard --%3E%3Cpolygon points='30,20 55,15 50,45 25,40' fill='%23EDE0D0' fill-opacity='0.28'/%3E%3C!-- Broken fragment 2 - triangle --%3E%3Cpolygon points='180,30 205,25 195,55' fill='%23EDE0D0' fill-opacity='0.25'/%3E%3C!-- Broken fragment 3 - angular piece --%3E%3Cpolygon points='90,70 120,65 125,90 100,95 85,80' fill='%23EDE0D0' fill-opacity='0.27'/%3E%3C!-- Broken fragment 4 - sharp wedge --%3E%3Cpolygon points='200,100 230,95 225,130 195,125' fill='%23EDE0D0' fill-opacity='0.26'/%3E%3C!-- Broken fragment 5 - small triangle --%3E%3Cpolygon points='40,120 65,115 55,145' fill='%23EDE0D0' fill-opacity='0.24'/%3E%3C!-- Broken fragment 6 - angular shard --%3E%3Cpolygon points='140,140 170,135 175,165 150,170 135,155' fill='%23EDE0D0' fill-opacity='0.28'/%3E%3C!-- Broken fragment 7 - wedge --%3E%3Cpolygon points='20,180 50,175 45,210 15,205' fill='%23EDE0D0' fill-opacity='0.25'/%3E%3C!-- Broken fragment 8 - triangle --%3E%3Cpolygon points='110,200 140,195 125,225' fill='%23EDE0D0' fill-opacity='0.27'/%3E%3C!-- Broken fragment 9 - small shard --%3E%3Cpolygon points='210,180 235,175 230,200 205,195' fill='%23EDE0D0' fill-opacity='0.26'/%3E%3C!-- Broken fragment 10 - angular piece --%3E%3Cpolygon points='70,30 90,25 95,50 75,55 65,40' fill='%23EDE0D0' fill-opacity='0.24'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '240px 240px',
      }}
    />
  );
}
