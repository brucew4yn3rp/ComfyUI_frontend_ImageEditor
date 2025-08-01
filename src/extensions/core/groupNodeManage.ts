import {
  type LGraphNode,
  type LGraphNodeConstructor,
  LiteGraph
} from '@comfyorg/litegraph'

import { useToastStore } from '@/stores/toastStore'

import { type ComfyApp, app } from '../../scripts/app'
import { $el } from '../../scripts/ui'
import { ComfyDialog } from '../../scripts/ui/dialog'
import { DraggableList } from '../../scripts/ui/draggableList'
import { GroupNodeConfig, GroupNodeHandler } from './groupNode'
import './groupNodeManage.css'

const ORDER: symbol = Symbol()
const PREFIX = 'workflow'
const SEPARATOR = '>'

// @ts-expect-error fixme ts strict error
function merge(target, source) {
  if (typeof target === 'object' && typeof source === 'object') {
    for (const key in source) {
      const sv = source[key]
      if (typeof sv === 'object') {
        let tv = target[key]
        if (!tv) tv = target[key] = {}
        merge(tv, source[key])
      } else {
        target[key] = sv
      }
    }
  }

  return target
}

export class ManageGroupDialog extends ComfyDialog<HTMLDialogElement> {
  // @ts-expect-error fixme ts strict error
  tabs: Record<
    'Inputs' | 'Outputs' | 'Widgets',
    { tab: HTMLAnchorElement; page: HTMLElement }
  >
  selectedNodeIndex: number | null | undefined
  selectedTab: keyof ManageGroupDialog['tabs'] = 'Inputs'
  selectedGroup: string | undefined
  modifications: Record<
    string,
    Record<
      string,
      Record<
        string,
        { name?: string | undefined; visible?: boolean | undefined }
      >
    >
  > = {}
  // @ts-expect-error fixme ts strict error
  nodeItems: any[]
  app: ComfyApp
  // @ts-expect-error fixme ts strict error
  groupNodeType: LGraphNodeConstructor<LGraphNode>
  groupNodeDef: any
  groupData: any

  // @ts-expect-error fixme ts strict error
  innerNodesList: HTMLUListElement
  // @ts-expect-error fixme ts strict error
  widgetsPage: HTMLElement
  // @ts-expect-error fixme ts strict error
  inputsPage: HTMLElement
  // @ts-expect-error fixme ts strict error
  outputsPage: HTMLElement
  draggable: any

  get selectedNodeInnerIndex() {
    // @ts-expect-error fixme ts strict error
    return +this.nodeItems[this.selectedNodeIndex].dataset.nodeindex
  }

  // @ts-expect-error fixme ts strict error
  constructor(app) {
    super()
    this.app = app
    this.element = $el('dialog.comfy-group-manage', {
      parent: document.body
    }) as HTMLDialogElement
  }

  // @ts-expect-error fixme ts strict error
  changeTab(tab) {
    this.tabs[this.selectedTab].tab.classList.remove('active')
    this.tabs[this.selectedTab].page.classList.remove('active')
    // @ts-expect-error fixme ts strict error
    this.tabs[tab].tab.classList.add('active')
    // @ts-expect-error fixme ts strict error
    this.tabs[tab].page.classList.add('active')
    this.selectedTab = tab
  }

  // @ts-expect-error fixme ts strict error
  changeNode(index, force?) {
    if (!force && this.selectedNodeIndex === index) return

    if (this.selectedNodeIndex != null) {
      this.nodeItems[this.selectedNodeIndex].classList.remove('selected')
    }
    this.nodeItems[index].classList.add('selected')
    this.selectedNodeIndex = index

    if (!this.buildInputsPage() && this.selectedTab === 'Inputs') {
      this.changeTab('Widgets')
    }
    if (!this.buildWidgetsPage() && this.selectedTab === 'Widgets') {
      this.changeTab('Outputs')
    }
    if (!this.buildOutputsPage() && this.selectedTab === 'Outputs') {
      this.changeTab('Inputs')
    }

    this.changeTab(this.selectedTab)
  }

  getGroupData() {
    this.groupNodeType = LiteGraph.registered_node_types[
      `${PREFIX}${SEPARATOR}` + this.selectedGroup
    ] as LGraphNodeConstructor<LGraphNode>
    this.groupNodeDef = this.groupNodeType.nodeData
    this.groupData = GroupNodeHandler.getGroupData(this.groupNodeType)
  }

  // @ts-expect-error fixme ts strict error
  changeGroup(group, reset = true) {
    this.selectedGroup = group
    this.getGroupData()

    const nodes = this.groupData.nodeData.nodes
    // @ts-expect-error fixme ts strict error
    this.nodeItems = nodes.map((n, i) =>
      $el(
        'li.draggable-item',
        {
          dataset: {
            nodeindex: n.index + ''
          },
          onclick: () => {
            this.changeNode(i)
          }
        },
        [
          $el('span.drag-handle'),
          $el(
            'div',
            {
              textContent: n.title ?? n.type
            },
            n.title
              ? $el('span', {
                  textContent: n.type
                })
              : []
          )
        ]
      )
    )

    this.innerNodesList.replaceChildren(...this.nodeItems)

    if (reset) {
      this.selectedNodeIndex = null
      this.changeNode(0)
    } else {
      const items = this.draggable.getAllItems()
      // @ts-expect-error fixme ts strict error
      let index = items.findIndex((item) => item.classList.contains('selected'))
      if (index === -1) index = this.selectedNodeIndex
      this.changeNode(index, true)
    }

    const ordered = [...nodes]
    this.draggable?.dispose()
    this.draggable = new DraggableList(this.innerNodesList, 'li')
    this.draggable.addEventListener(
      'dragend',
      // @ts-expect-error fixme ts strict error
      ({ detail: { oldPosition, newPosition } }) => {
        if (oldPosition === newPosition) return
        ordered.splice(newPosition, 0, ordered.splice(oldPosition, 1)[0])
        for (let i = 0; i < ordered.length; i++) {
          this.storeModification({
            nodeIndex: ordered[i].index,
            section: ORDER,
            prop: 'order',
            value: i
          })
        }
      }
    )
  }

  storeModification(props: {
    nodeIndex?: number
    section: symbol
    prop: string
    value: any
  }) {
    const { nodeIndex, section, prop, value } = props
    // @ts-expect-error fixme ts strict error
    const groupMod = (this.modifications[this.selectedGroup] ??= {})
    const nodesMod = (groupMod.nodes ??= {})
    const nodeMod = (nodesMod[nodeIndex ?? this.selectedNodeInnerIndex] ??= {})
    const typeMod = (nodeMod[section] ??= {})
    if (typeof value === 'object') {
      const objMod = (typeMod[prop] ??= {})
      Object.assign(objMod, value)
    } else {
      typeMod[prop] = value
    }
  }

  // @ts-expect-error fixme ts strict error
  getEditElement(section, prop, value, placeholder, checked, checkable = true) {
    if (value === placeholder) value = ''

    const mods =
      // @ts-expect-error fixme ts strict error
      this.modifications[this.selectedGroup]?.nodes?.[
        this.selectedNodeInnerIndex
      ]?.[section]?.[prop]
    if (mods) {
      if (mods.name != null) {
        value = mods.name
      }
      if (mods.visible != null) {
        checked = mods.visible
      }
    }

    return $el('div', [
      $el('input', {
        value,
        placeholder,
        type: 'text',
        // @ts-expect-error fixme ts strict error
        onchange: (e) => {
          this.storeModification({
            section,
            prop,
            value: { name: e.target.value }
          })
        }
      }),
      $el('label', { textContent: 'Visible' }, [
        $el('input', {
          type: 'checkbox',
          checked,
          disabled: !checkable,
          // @ts-expect-error fixme ts strict error
          onchange: (e) => {
            this.storeModification({
              section,
              prop,
              value: { visible: !!e.target.checked }
            })
          }
        })
      ])
    ])
  }

  buildWidgetsPage() {
    const widgets =
      this.groupData.oldToNewWidgetMap[this.selectedNodeInnerIndex]
    const items = Object.keys(widgets ?? {})
    // @ts-expect-error fixme ts strict error
    const type = app.graph.extra.groupNodes[this.selectedGroup]
    const config = type.config?.[this.selectedNodeInnerIndex]?.input
    this.widgetsPage.replaceChildren(
      ...items.map((oldName) => {
        return this.getEditElement(
          'input',
          oldName,
          widgets[oldName],
          oldName,
          config?.[oldName]?.visible !== false
        )
      })
    )
    return !!items.length
  }

  buildInputsPage() {
    const inputs = this.groupData.nodeInputs[this.selectedNodeInnerIndex]
    const items = Object.keys(inputs ?? {})
    // @ts-expect-error fixme ts strict error
    const type = app.graph.extra.groupNodes[this.selectedGroup]
    const config = type.config?.[this.selectedNodeInnerIndex]?.input
    this.inputsPage.replaceChildren(
      // @ts-expect-error fixme ts strict error
      ...items
        .map((oldName) => {
          let value = inputs[oldName]
          if (!value) {
            return
          }

          return this.getEditElement(
            'input',
            oldName,
            value,
            oldName,
            config?.[oldName]?.visible !== false
          )
        })
        .filter(Boolean)
    )
    return !!items.length
  }

  buildOutputsPage() {
    const nodes = this.groupData.nodeData.nodes
    const innerNodeDef = this.groupData.getNodeDef(
      nodes[this.selectedNodeInnerIndex]
    )
    const outputs = innerNodeDef?.output ?? []
    const groupOutputs =
      this.groupData.oldToNewOutputMap[this.selectedNodeInnerIndex]

    // @ts-expect-error fixme ts strict error
    const type = app.graph.extra.groupNodes[this.selectedGroup]
    const config = type.config?.[this.selectedNodeInnerIndex]?.output
    const node = this.groupData.nodeData.nodes[this.selectedNodeInnerIndex]
    const checkable = node.type !== 'PrimitiveNode'
    this.outputsPage.replaceChildren(
      ...outputs
        // @ts-expect-error fixme ts strict error
        .map((type, slot) => {
          const groupOutputIndex = groupOutputs?.[slot]
          const oldName = innerNodeDef.output_name?.[slot] ?? type
          let value = config?.[slot]?.name
          const visible = config?.[slot]?.visible || groupOutputIndex != null
          if (!value || value === oldName) {
            value = ''
          }
          return this.getEditElement(
            'output',
            slot,
            value,
            oldName,
            visible,
            checkable
          )
        })
        .filter(Boolean)
    )
    return !!outputs.length
  }

  // @ts-expect-error fixme ts strict error
  show(type?) {
    const groupNodes = Object.keys(app.graph.extra?.groupNodes ?? {}).sort(
      (a, b) => a.localeCompare(b)
    )

    this.innerNodesList = $el(
      'ul.comfy-group-manage-list-items'
    ) as HTMLUListElement
    this.widgetsPage = $el('section.comfy-group-manage-node-page')
    this.inputsPage = $el('section.comfy-group-manage-node-page')
    this.outputsPage = $el('section.comfy-group-manage-node-page')
    const pages = $el('div', [
      this.widgetsPage,
      this.inputsPage,
      this.outputsPage
    ])

    this.tabs = [
      ['Inputs', this.inputsPage],
      ['Widgets', this.widgetsPage],
      ['Outputs', this.outputsPage]
      // @ts-expect-error fixme ts strict error
    ].reduce((p, [name, page]: [string, HTMLElement]) => {
      // @ts-expect-error fixme ts strict error
      p[name] = {
        tab: $el('a', {
          onclick: () => {
            this.changeTab(name)
          },
          textContent: name
        }),
        page
      }
      return p
    }, {}) as any

    const outer = $el('div.comfy-group-manage-outer', [
      $el('header', [
        $el('h2', 'Group Nodes'),
        $el(
          'select',
          {
            // @ts-expect-error fixme ts strict error
            onchange: (e) => {
              this.changeGroup(e.target.value)
            }
          },
          groupNodes.map((g) =>
            $el('option', {
              textContent: g,
              selected: `${PREFIX}${SEPARATOR}${g}` === type,
              value: g
            })
          )
        )
      ]),
      $el('main', [
        $el('section.comfy-group-manage-list', this.innerNodesList),
        $el('section.comfy-group-manage-node', [
          $el(
            'header',
            Object.values(this.tabs).map((t) => t.tab)
          ),
          pages
        ])
      ]),
      $el('footer', [
        $el(
          'button.comfy-btn',
          {
            onclick: () => {
              const node = app.graph.nodes.find(
                (n) => n.type === `${PREFIX}${SEPARATOR}` + this.selectedGroup
              )
              if (node) {
                useToastStore().addAlert(
                  'This group node is in use in the current workflow, please first remove these.'
                )
                return
              }
              if (
                confirm(
                  `Are you sure you want to remove the node: "${this.selectedGroup}"`
                )
              ) {
                // @ts-expect-error fixme ts strict error
                delete app.graph.extra.groupNodes[this.selectedGroup]
                LiteGraph.unregisterNodeType(
                  `${PREFIX}${SEPARATOR}` + this.selectedGroup
                )
              }
              this.show()
            }
          },
          'Delete Group Node'
        ),
        $el(
          'button.comfy-btn',
          {
            onclick: async () => {
              let nodesByType
              let recreateNodes = []
              const types = {}
              for (const g in this.modifications) {
                // @ts-expect-error fixme ts strict error
                const type = app.graph.extra.groupNodes[g]
                let config = (type.config ??= {})

                let nodeMods = this.modifications[g]?.nodes
                if (nodeMods) {
                  const keys = Object.keys(nodeMods)
                  // @ts-expect-error fixme ts strict error
                  if (nodeMods[keys[0]][ORDER]) {
                    // If any node is reordered, they will all need sequencing
                    const orderedNodes = []
                    const orderedMods = {}
                    const orderedConfig = {}

                    for (const n of keys) {
                      // @ts-expect-error fixme ts strict error
                      const order = nodeMods[n][ORDER].order
                      orderedNodes[order] = type.nodes[+n]
                      // @ts-expect-error fixme ts strict error
                      orderedMods[order] = nodeMods[n]
                      orderedNodes[order].index = order
                    }

                    // Rewrite links
                    for (const l of type.links) {
                      if (l[0] != null) l[0] = type.nodes[l[0]].index
                      if (l[2] != null) l[2] = type.nodes[l[2]].index
                    }

                    // Rewrite externals
                    if (type.external) {
                      for (const ext of type.external) {
                        ext[0] = type.nodes[ext[0]]
                      }
                    }

                    // Rewrite modifications
                    for (const id of keys) {
                      if (config[id]) {
                        // @ts-expect-error fixme ts strict error
                        orderedConfig[type.nodes[id].index] = config[id]
                      }
                      delete config[id]
                    }

                    type.nodes = orderedNodes
                    nodeMods = orderedMods
                    type.config = config = orderedConfig
                  }

                  merge(config, nodeMods)
                }

                // @ts-expect-error fixme ts strict error
                types[g] = type

                if (!nodesByType) {
                  nodesByType = app.graph.nodes.reduce((p, n) => {
                    // @ts-expect-error fixme ts strict error
                    p[n.type] ??= []
                    // @ts-expect-error fixme ts strict error
                    p[n.type].push(n)
                    return p
                  }, {})
                }

                // @ts-expect-error fixme ts strict error
                const nodes = nodesByType[`${PREFIX}${SEPARATOR}` + g]
                if (nodes) recreateNodes.push(...nodes)
              }

              await GroupNodeConfig.registerFromWorkflow(types, {})

              for (const node of recreateNodes) {
                node.recreate()
              }

              this.modifications = {}
              this.app.graph.setDirtyCanvas(true, true)
              this.changeGroup(this.selectedGroup, false)
            }
          },
          'Save'
        ),
        $el(
          'button.comfy-btn',
          { onclick: () => this.element.close() },
          'Close'
        )
      ])
    ])

    this.element.replaceChildren(outer)
    this.changeGroup(
      type
        ? groupNodes.find((g) => `${PREFIX}${SEPARATOR}${g}` === type) ??
            groupNodes[0]
        : groupNodes[0]
    )
    this.element.showModal()

    this.element.addEventListener('close', () => {
      this.draggable?.dispose()
      this.element.remove()
    })
  }
}
