export const speechState:{state:'idle'|'loading'|'ready'|'error'}={state:'idle'};
export function getSpeechStatus(){return {...speechState,model:process.env.WHISPER_MODEL || 'Xenova/whisper-small'};}
