// Frozen defaults from Kumbhakarna Prototype Specification v1.0, §6.9.
// No runtime calibration or hidden multipliers are permitted.
export const PARAMS = {
  ratedKVA:250, baseHomes:332, batteryKWh:1.8, dischargeEfficiency:0.85,
  chargeVoltage:14, chargerEfficiency:0.82, chargeAcceptance:0.88, chargerPF:0.75,
  fullSOC:0.995, taperStartSOC:0.8, taperFloor:0.1, lowVoltageCutoffSOC:0.2,
  miscKW:0.01, miscPF:0.9, coolerWiredShare:0.85, coolerRestartMax:5,
  pumpRunMin:[5,15] as const, preOutageSOC:[0.95,1.0] as const,
  thermal:{x:0.8,y:1.6,R:5,k11:1,k21:1,k22:2,tauOil:180,tauWinding:4,agingRef:98,agingDoubling:6},
  strategyColors:{NO_CONTROL:"#C8423F",RANDOM_DELAY:"#E39B1B",SMART_LOCAL:"#3DCD58",SMART_DT_AWARE:"#005C30",COUNTERFACTUAL:"#8C9C93"},
  strategyLabels:{NO_CONTROL:"No control",RANDOM_DELAY:"Random delay",SMART_LOCAL:"Smart Recharge · local",SMART_DT_AWARE:"Smart Recharge · transformer-aware",COUNTERFACTUAL:"Counterfactual"},
} as const;
export type ThermalDesign="generic"|"lowRise";
export type StrategyKey=keyof typeof PARAMS.strategyLabels;
