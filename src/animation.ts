export const meleeContact=.14
export const castRelease=.10
export const flightToContact=.42*.63

export function attackFrame(elapsed:number){
 return elapsed<.065?'ready':elapsed<meleeContact?'draw':elapsed<.22?'contact':'recover'
}
export function attackDuration(projectile:boolean){
 return projectile?meleeContact+flightToContact+.045:.30
}
export function locomotionFrame(direction:number){
 return 'walk-'+direction
}
