import { createClient, type Deployment } from '../sdk/api/src/product/client.ts';
export function deployment(): Deployment {
  const env=(import.meta as ImportMeta & {env?:Record<string,string>}).env??{};
  return {apiOrigin:env.VITE_YESSYFY_API_ORIGIN??'',mainOrigin:env.VITE_YESSYFY_MAIN_ORIGIN??'http://localhost:5173',visionOrigin:env.VITE_YESSYFY_VISION_ORIGIN??'http://localhost:5174',environment:env.VITE_YESSYFY_ENVIRONMENT??'default'};
}
export function realClient(){return createClient(deployment());}
