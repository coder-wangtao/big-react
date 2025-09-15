// Max 31 bit integer. The max integer size in V8 for 32-bit systems.
// Math.pow(2, 30) - 1
// 如果是 IdlePriority，对应的 timeout 时间为 IDLE_PRIORITY_TIMEOUT，它是一个常量，值为 1073741823，
// 0b111111111111111111111111111111
// 根据注释可以看出，maxSigned31BitInt 表示 32 位系统下 V8 最大的整数，它是最大的 31 位整数，
// 它的二进制为 0b111111111111111111111111111111，这其中 0b表示这是一个二进制数字，后面跟了一共 30 个 1，
// 所以这个值是 2 的 30 次方 - 1，也就是 1073741823，这个时间大概是 12.4 天

export const maxSigned31BitInt = 1073741823;

export const userBlockingPriorityTimeout = 250;
export const normalPriorityTimeout = 5000;
export const lowPriorityTimeout = 10000;
