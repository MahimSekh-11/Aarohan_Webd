import { rm } from 'node:fs/promises';
for(const name of ['dist','build'])await rm(new URL(`../${name}/`,import.meta.url),{recursive:true,force:true});
