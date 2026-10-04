import type { Measurement } from "@/types/h2s";
const wait=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
export const mockMeasurementService={
 async validateImage(invalid=false){await wait(10);return invalid?{valid:false,score:41,reason:"Excessive glare"}:{valid:true,score:94,checks:["Badge detected","Sensing region detected","Reference palette detected","Lighting acceptable","Sharpness acceptable","Glare within acceptable range"]};},
 async runColorAnalysis(){await wait(10);return {raw:{r:105,g:85,b:70},normalized:"oklch(0.47 0.04 53)",complete:true};},
 async runExposureEstimation(){await wait(10);return {exposure:2.1,confidence:92,uncertainty:"±0.3 ppm·h",range:"Within validated range"};},
 async saveMeasurement(measurement:Measurement){await wait(10);const saved=JSON.parse(localStorage.getItem("h2s.saved")||"[]") as Measurement[];localStorage.setItem("h2s.saved",JSON.stringify([measurement,...saved]));return measurement;},
 async syncRecords(){await wait(10);localStorage.setItem("h2s.pending","0");return {synced:true};}
};
export const mockWorkerService={async list(){await wait(10);return import("@/data/mockData").then(m=>m.workers)}};
export const mockBadgeService={async list(){await wait(10);return import("@/data/mockData").then(m=>m.badges)}};
export const mockCalibrationService={async getCurrent(){await wait(10);return {version:"CAL-03",status:"Active",features:["Normalized RGB","HSV","Reference Color Difference"]}}};
