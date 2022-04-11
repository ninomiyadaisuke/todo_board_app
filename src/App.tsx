import React, { useState } from 'react'
import styled from 'styled-components'
import produce from 'immer'
import { randomID } from './util'
import { api } from './api'
import { Header as _Header } from './Header'
import { Column } from './Column'
import { DeleteDialog } from './DeleteDialog'
import { Overlay as _Overlay } from './Overlay'

export const App = () => {
  const [filterValue, setFilterValue] = useState('')
  const [columns, setColumns] = useState([
    {
      id: 'A',
      title: 'TODO',
      text: '',
      cards: [
        { id: 'a', text: '朝食をとる🍞' },
        { id: 'b', text: 'SNSをチェックする🐦' },
        { id: 'c', text: '布団に入る (:3[___]' },
      ],
    },
    {
      id: 'B',
      title: 'Doing',
      text: '',
      cards: [
        { id: 'd', text: '顔を洗う👐' },
        { id: 'e', text: '歯を磨く🦷' },
      ],
    },
    {
      id: 'C',
      title: 'Waiting',
      text: '',
      cards: [],
    },
    {
      id: 'D',
      title: 'Done',
      text: '',
      cards: [{ id: 'f', text: '布団から出る (:3っ)っ -=三[＿＿]' }],
    },
  ])

  const [draggingCardID, setDraggingCardID] = useState<string | undefined>(
    undefined,
  )
  const [deletingCardID, setDeletingCardID] = useState<string | undefined>(
    undefined,
  )

  const setText = (columnsID: string, value: string) => {
    type Columns = typeof columns
    setColumns(
      produce((columns: Columns) => {
        const column = columns.find((c) => c.id === columnsID)
        if (!column) return
        column.text = value
      }),
    )
  }

  const addCard = (columnID: string) => {
    const column = columns.find(c => c.id === columnID)
    if (!column) return

    const text = column.text
    const cardID = randomID()

    type Columns = typeof columns
    setColumns(
      produce((columns: Columns) => {
        const column = columns.find((c) => c.id === columnID)
        if (!column) return

        column.cards.unshift({
          id: cardID,
          text: column.text,
        })
        column.text = ''
      }),
    )
    api('POST /v1/cards', {
      id: cardID,
      text,
    })
  }

  const deleteCard = () => {
    const cardID = deletingCardID
    if (!cardID) return
    setDeletingCardID(undefined)
    type Columns = typeof columns
    setColumns(
      produce((columns: Columns) => {
        const column = columns.find((col) =>
          col.cards.some((c) => c.id === cardID),
        )
        if (!column) return
        column.cards = column.cards.filter((c) => c.id !== cardID)
      }),
    )
  }

  const dropCardTo = (toID: string) => {
    const cardID = draggingCardID
    if (!cardID) return
    setDraggingCardID(undefined)
    if (cardID === toID) return
    //columnsの型を定義
    type Columns = typeof columns
    setColumns(
      produce((columns: Columns) => {
        const card = columns
          .flatMap((col) => col.cards)
          .find((c) => c.id === cardID)
        if (!card) return

        const fromColumn = columns.find((col) =>
          col.cards.some((c) => c.id === cardID),
        )
        if (!fromColumn) return
        fromColumn.cards = fromColumn.cards.filter((c) => c.id !== cardID)
        const toColumn = columns.find(
          (col) => col.id === toID || col.cards.some((c) => c.id === toID),
        )
        if (!toColumn) return
        let index = toColumn.cards.findIndex((c) => c.id === toID)
        if (index < 0) {
          index = toColumn.cards.length
        }
        toColumn.cards.splice(index, 0, card)
      }),
    )
  }

  return (
    <Container>
      <Header filterValue={filterValue} onFilterChange={setFilterValue} />

      <MainArea>
        <HorizontalScroll>
          {columns.map(({ id: columnID, title, cards, text }) => (
            <Column
              key={columnID}
              title={title}
              filterValue={filterValue}
              cards={cards}
              onCardDragStart={(cardID) => setDraggingCardID(cardID)}
              onCardDrop={(entered) => dropCardTo(entered ?? columnID)}
              onCardDeleteClick={(cardID) => setDeletingCardID(cardID)}
              text={text}
              onTextChange={(value) => setText(columnID, value)}
              onTextConfirm={() => addCard(columnID)}
            />
          ))}
        </HorizontalScroll>
      </MainArea>
      {deletingCardID && (
        <Overlay onClick={() => setDeletingCardID(undefined)}>
          <DeleteDialog
            onConfirm={deleteCard}
            onCancel={() => setDeletingCardID(undefined)}
          />
        </Overlay>
      )}
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-flow: column;
  height: 100%;
`

const Header = styled(_Header)`
  flex-shrink: 0;
`

const MainArea = styled.div`
  height: 100%;
  padding: 16px 0;
  overflow-y: auto;
`

const HorizontalScroll = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  overflow-x: auto;

  > * {
    margin-left: 16px;
    flex-shrink: 0;
  }
  ::after {
    display: block;
    flex: 0 0 16px;
    content: '';
  }
`

const Overlay = styled(_Overlay)`
  display: flex;
  justify-content: center;
  align-items: center;
`

// const dropCardTo = (toID: string) => {
//   const cardID = draggingCardID
//   if (!cardID) return
//   setDraggingCardID(undefined)
//   if (cardID === toID) return
//   setColumns((columns) => {
//     //選択されたカード情報を抽出(オブジェクトで)
//     const card = columns
//       .flatMap((col) => col.cards)
//       .find((c) => c.id === cardID)
//     if (!card) {
//       return columns
//     }
//     return columns.map((column) => {
//       let newColumn = column
//       //カラムからカードを消されたときの処理
//       if (newColumn.cards.some((c) => c.id === cardID)) {
//         newColumn = {
//           ...newColumn,
//           cards: newColumn.cards.filter((c) => c.id !== cardID),
//         }
//       }
//       // // 列の末尾に移動
//       if (newColumn.id === toID) {
//         newColumn = {
//           ...newColumn,
//           cards: [...newColumn.cards, card],
//         }
//       }
//       // 列の末尾以外に移動
//       else if (newColumn.cards.some((c) => c.id === toID)) {
//         newColumn = {
//           ...newColumn,
//           cards: newColumn.cards.flatMap((c) =>
//             c.id === toID ? [card, c] : [c],
//           ),
//         }
//       }
//       return newColumn
//     })
//   })
// }
