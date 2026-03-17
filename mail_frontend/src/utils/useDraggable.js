/**
 * 使 DOM 元素可拖动
 * @param {Ref<HTMLElement>} handleRef - 拖动触发区域（header）
 * @param {Ref<HTMLElement>} targetRef - 被移动的元素（整个弹窗）
 */
export function useDraggable(handleRef, targetRef) {
  function onMousedown(e) {
    if (e.button !== 0) return
    const el = targetRef.value
    if (!el) return

    const rect = el.getBoundingClientRect()
    const startMouseX = e.clientX
    const startMouseY = e.clientY
    let dragging = false

    function onMousemove(e) {
      if (!dragging) {
        // 第一次移动时才切换定位，避免点击时位置跳变
        el.style.transform = 'none'
        el.style.left = rect.left + 'px'
        el.style.top = rect.top + 'px'
        el.style.margin = '0'
        dragging = true
      }

      let x = rect.left + (e.clientX - startMouseX)
      let y = rect.top + (e.clientY - startMouseY)
      x = Math.max(0, Math.min(x, window.innerWidth - el.offsetWidth))
      y = Math.max(0, Math.min(y, window.innerHeight - el.offsetHeight))
      el.style.left = x + 'px'
      el.style.top = y + 'px'
    }

    function onMouseup() {
      document.removeEventListener('mousemove', onMousemove)
      document.removeEventListener('mouseup', onMouseup)
    }

    document.addEventListener('mousemove', onMousemove)
    document.addEventListener('mouseup', onMouseup)
    e.preventDefault()
  }

  function init() {
    const handle = handleRef.value
    if (handle) {
      handle.style.cursor = 'move'
      handle.addEventListener('mousedown', onMousedown)
    }
  }

  function destroy() {
    const handle = handleRef.value
    if (handle) handle.removeEventListener('mousedown', onMousedown)
  }

  return { init, destroy }
}
