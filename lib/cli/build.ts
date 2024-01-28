export async function buildClientAndServer(): Promise<string> {
    return new Promise((resolve, reject) => {
        doBuildClientAndServer().then(resolve).catch(reject)
    })
}

async function doBuildClientAndServer(): Promise<string> {
    return new Promise((resolve) => {
        resolve('success')
    })
}
