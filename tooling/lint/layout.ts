const domainFile = /^domains\/[^/]+\/[^/.]+\.ts$/

const serviceFile = /^domains\/([^/]+)\/(\1|[^/.]+Repo|migrations)\.ts$/i

export const isServiceDomainFile = (path: string): boolean => serviceFile.test(path)

export const isPureDomainModule = (path: string): boolean => domainFile.test(path) && !isServiceDomainFile(path)
