import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Logo = ({ isCollapsed = false, size = 'default' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Generate a unique ID suffix for this instance to prevent ID collisions
  const [idSuffix] = React.useState(() => Math.random().toString(36).substr(2, 9));
  
  // Define logo sizes
  const logoSizes = {
    default: { width: 100, height: 27 },
    mobile: { width: 85, height: 23 },
    small: { width: 80, height: 22 }
  };
  
  const currentSize = logoSizes[size] || logoSizes.default;

  const handleClick = () => {
    // Navigate to home based on user role
    if (user?.role === 'coach') {
      // Add reset parameter to ensure CoachDashboard resets selectedStudent state
      navigate('/coach/dashboard?reset=true');
    } else if (user?.role === 'student') {
      navigate('/student/dashboard');
    } else {
      // Default to login page if no user role (not logged in or unknown)
      navigate('/login');
    }
  };

  // When collapsed, show icon only
  if (isCollapsed) {
    return (
      <div 
        className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity relative z-50"
        onClick={handleClick}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 3011 2509"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="flex-shrink-0"
          style={{ height: 'auto', maxHeight: '24px', width: '24px' }}
        >
          <path d="M1.43011e-05 0C395.417 0.00942249 786.963 64.6602 1152.28 190.253C1517.59 315.846 1849.53 499.921 2129.12 731.978C2408.72 964.034 2630.51 1239.53 2781.82 1542.72C2933.13 1845.91 3011.01 2170.87 3011 2499.04L2514.18 2499.02C2514.19 2166.38 2436.31 1836.98 2285 1529.65C2133.69 1222.32 1911.9 943.07 1632.31 707.845C1352.71 472.619 1020.77 286.022 655.459 158.714C444.297 85.1269 224.371 32.1816 0 0.599165L1.43011e-05 0Z" fill="white"/>
          <path d="M10.5748 1003.6L10.5508 2007.2C141.631 2007.21 271.428 1981.25 392.532 1930.81C513.636 1880.38 623.677 1806.46 716.368 1713.27C809.058 1620.08 882.583 1509.44 932.748 1387.68C981.972 1268.2 1007.74 1140.31 1008.69 1011.04C1008.05 1206.21 982.27 1399.35 932.731 1579.71C882.565 1762.35 809.038 1928.31 716.347 2068.09C623.655 2207.88 513.613 2318.76 392.508 2394.41C271.404 2470.06 141.607 2509 10.5265 2509L10.5624 1003.6H10.5748Z" fill={`url(#paint0_linear_564_3565_${idSuffix})`}/>
          <defs>
            <linearGradient id={`paint0_linear_564_3565_${idSuffix}`} x1="509.64" y1="1003.61" x2="509.604" y2="2509.01" gradientUnits="userSpaceOnUse">
              <stop stopOpacity="0"/>
              <stop offset="1" stopColor="white"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  // When expanded, show full logo with text
  return (
    <div 
      className="flex items-center cursor-pointer hover:opacity-80 transition-opacity relative z-50"
      onClick={handleClick}
    >
      <svg
        width={currentSize.width}
        height={currentSize.height}
        viewBox="0 0 11766 3227"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
        style={{ 
          height: 'auto', 
          maxHeight: `${currentSize.height}px`, 
          width: `${currentSize.width}px`, 
          minWidth: `${currentSize.width}px` 
        }}
      >
        <path d="M0 0C424.209 0.00131943 844.275 69.3547 1236.19 204.113C1628.11 338.872 1984.21 536.408 2284.17 785.409C2584.14 1034.41 2822.07 1330.02 2984.41 1655.36C3146.75 1980.7 3230.3 2329.39 3230.3 2681.54H2697.32C2697.32 2324.58 2613.77 1971.12 2451.43 1641.34C2289.09 1311.56 2051.13 1011.9 1751.17 759.498C1451.21 507.099 1095.1 306.874 703.184 170.276C476.65 91.3204 240.704 34.5701 0 0.68588V0Z" fill="white"/>
        <path d="M1082.12 1076.92C1082.12 1289.06 1054.43 1499.12 1000.61 1695.1C946.797 1891.09 867.899 2069.16 768.461 2219.17C669.025 2369.16 550.992 2488.17 421.073 2569.34C291.155 2650.52 151.9 2692.29 11.2778 2692.3V2153.83C151.9 2153.83 291.155 2125.97 421.073 2071.85C550.986 2017.74 669.029 1938.42 768.461 1838.43C867.899 1738.42 946.797 1619.69 1000.61 1489.03C1054.43 1358.38 1082.12 1218.34 1082.12 1076.92Z" fill={`url(#paint0_linear_563_1184_${idSuffix})`}/>
        <path d="M4166.63 908.99H4340.62V1822.22L5194.04 908.99H5432.79L4604.77 1794.28L5431.52 2679.57H5192.77L4485.39 1922.56L4340.62 2077.52V2678.3H4166.63V908.99Z" fill={`url(#paint1_linear_563_1184_${idSuffix})`}/>
        <path d="M7072.08 2679.57H6898.09V2485.24C6813.42 2558.91 6735.53 2609.71 6664.41 2637.65C6593.3 2665.6 6517.94 2679.57 6438.36 2679.57C6321.52 2679.57 6214.84 2651.2 6118.33 2594.47C6022.65 2536.89 5946.03 2460.26 5888.46 2364.57C5831.74 2268.89 5803.37 2162.62 5803.37 2045.77C5803.37 1928.91 5831.74 1822.65 5888.46 1726.96C5946.03 1630.43 6022.65 1553.8 6118.33 1497.07C6214.84 1440.33 6321.52 1411.97 6438.36 1411.97C6553.5 1411.97 6658.91 1439.91 6754.58 1495.8C6850.25 1551.68 6926.03 1627.04 6981.91 1721.88C7038.63 1815.87 7068.69 1921.29 7072.08 2038.15V2679.57ZM6438.36 1585.98C6353.69 1585.98 6276.65 1606.72 6207.22 1648.21C6137.8 1689.7 6082.34 1745.17 6040.86 1814.6C5999.37 1884.04 5978.63 1961.09 5978.63 2045.77C5978.63 2129.6 5999.37 2206.65 6040.86 2276.93C6082.34 2346.37 6137.8 2401.83 6207.22 2443.32C6276.65 2483.97 6353.69 2504.29 6438.36 2504.29C6522.18 2504.29 6598.8 2483.97 6668.22 2443.32C6737.65 2401.83 6793.1 2346.37 6834.59 2276.93C6876.08 2206.65 6896.82 2129.6 6896.82 2045.77C6896.82 1961.09 6876.08 1884.04 6834.59 1814.6C6793.1 1745.17 6737.65 1689.7 6668.22 1648.21C6598.8 1606.72 6522.18 1585.98 6438.36 1585.98Z" fill={`url(#paint2_linear_563_1184_${idSuffix})`}/>
        <path d="M7569.65 1410.7H7743.64V2679.57H7569.65V1410.7ZM7656.01 908.99C7680.56 908.99 7700.88 917.458 7716.97 934.393C7733.9 951.328 7742.37 971.65 7742.37 995.36C7742.37 1019.07 7733.9 1039.39 7716.97 1056.33C7700.88 1073.26 7680.56 1081.73 7656.01 1081.73C7632.3 1081.73 7611.98 1073.26 7595.05 1056.33C7578.12 1039.39 7569.65 1019.07 7569.65 995.36C7569.65 971.65 7578.12 951.328 7595.05 934.393C7611.98 917.458 7632.3 908.99 7656.01 908.99Z" fill={`url(#paint3_linear_563_1184_${idSuffix})`}/>
        <path d="M8406.31 1409.43L8808.89 2461.1L9211.47 1409.43H9398.16L8905.41 2694.81C8902.87 2700.74 8900.33 2707.09 8897.79 2713.86C8855.46 2816.32 8811.43 2905.65 8765.71 2981.86C8720.84 3058.07 8660.73 3117.34 8585.38 3159.68C8510.87 3202.87 8415.62 3225.31 8299.63 3227V3051.72C8391.07 3047.49 8475.74 3014.46 8553.63 2952.65C8632.37 2890.84 8686.13 2807.85 8714.91 2703.7L8219.62 1409.43H8406.31Z" fill={`url(#paint4_linear_563_1184_${idSuffix})`}/>
        <path d="M9875.42 908.99H10049.4L10043.1 2679.57H9867.8L9875.42 908.99Z" fill={`url(#paint5_linear_563_1184_${idSuffix})`}/>
        <path d="M11766 2067.99C11766 2419.97 11480.7 2705.3 11128.8 2705.3C10776.8 2705.3 10491.6 2419.97 10491.6 2067.99C10491.6 1716.02 10776.8 1430.69 11128.8 1430.69C11480.7 1430.69 11766 1716.02 11766 2067.99ZM10666 2067.99C10666 2323.59 10873.2 2530.79 11128.8 2530.79C11384.3 2530.79 11591.5 2323.59 11591.5 2067.99C11591.5 1812.4 11384.3 1605.2 11128.8 1605.2C10873.2 1605.2 10666 1812.4 10666 2067.99Z" fill="#646565"/>
        <path d="M11128.8 1430.69C11240.6 1430.69 11350.5 1460.13 11447.4 1516.05C11544.2 1571.98 11624.7 1652.42 11680.6 1749.28C11736.5 1846.15 11766 1956.04 11766 2067.89C11766 2179.75 11736.6 2289.65 11680.7 2386.53L11529.6 2299.31C11570.2 2228.95 11591.5 2149.15 11591.5 2067.92C11591.5 1986.69 11570.1 1906.9 11529.5 1836.56C11488.9 1766.21 11430.5 1707.8 11360.1 1667.19C11289.8 1626.58 11210 1605.2 11128.8 1605.2V1430.69Z" fill={`url(#paint6_linear_563_1184_${idSuffix})`}/>
        <path d="M11089.8 1430.69H11193.8V1612.78H11089.8V1430.69Z" fill="#1E1E1E"/>
        <path d="M11505.9 2330.82L11557.6 2240.51L11715.6 2330.94L11663.9 2421.25L11505.9 2330.82Z" fill="#1E1E1E"/>
        <defs>
          <linearGradient id={`paint0_linear_563_1184_${idSuffix}`} x1="1991.28" y1="1290.8" x2="1991.28" y2="3227" gradientUnits="userSpaceOnUse">
            <stop stopOpacity="0"/>
            <stop offset="1" stopColor="white"/>
          </linearGradient>
          <linearGradient id={`paint1_linear_563_1184_${idSuffix}`} x1="16387.6" y1="1178.48" x2="-50.8008" y2="1178.48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#575858"/>
            <stop offset="1" stopColor="white"/>
          </linearGradient>
          <linearGradient id={`paint2_linear_563_1184_${idSuffix}`} x1="16387.6" y1="1178.48" x2="-50.8008" y2="1178.48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#575858"/>
            <stop offset="1" stopColor="white"/>
          </linearGradient>
          <linearGradient id={`paint3_linear_563_1184_${idSuffix}`} x1="16387.6" y1="1178.48" x2="-50.8008" y2="1178.48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#575858"/>
            <stop offset="1" stopColor="white"/>
          </linearGradient>
          <linearGradient id={`paint4_linear_563_1184_${idSuffix}`} x1="16387.6" y1="1178.48" x2="-50.8008" y2="1178.48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#575858"/>
            <stop offset="1" stopColor="white"/>
          </linearGradient>
          <linearGradient id={`paint5_linear_563_1184_${idSuffix}`} x1="16387.6" y1="1178.48" x2="-50.8008" y2="1178.48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#575858"/>
            <stop offset="1" stopColor="white"/>
          </linearGradient>
          <linearGradient id={`paint6_linear_563_1184_${idSuffix}`} x1="5883" y1="0" x2="5883" y2="3227" gradientUnits="userSpaceOnUse">
            <stop stopColor="#D4845A"/>
            <stop offset="1" stopColor="#6E452F"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default Logo;
