/** 新的重要通知类型在这里定义文案和展示方式；未知类型使用服务端文案。 */
export const importantNotificationPresenters = {
  shared_domain_earnings: (notification, t) => ({
    eyebrow: t('importantNotifications.important'),
    title: t('importantNotifications.sharedEarningsTitle'),
    content: t('importantNotifications.sharedEarningsDescription', {
      orders: Number(notification.payload?.orders || 0)
    }),
    amount: Number(notification.payload?.amount || 0).toFixed(2),
    effect: 'coins'
  }),
  announcement: (notification, t) => ({
    eyebrow: t('importantNotifications.announcement'),
    title: notification.title,
    content: notification.content,
    amount: null,
    effect: 'none'
  })
}

export function presentImportantNotification(notification, t) {
  return (
    importantNotificationPresenters[notification.notification_type]?.(notification, t) || {
      title: notification.title,
      content: notification.content,
      eyebrow: t('importantNotifications.generic'),
      amount: null,
      effect: notification.effect || 'none'
    }
  )
}
