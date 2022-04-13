import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { useDispatch, useSelector } from 'react-redux'
import produce from 'immer'
import { randomID, sortBy, reorderPatch } from './util'
import { api, ColumnID, CardID } from './api'
import { Header as _Header } from './Header'
import { Column } from './Column'
import { DeleteDialog } from './DeleteDialog'
import { Overlay as _Overlay } from './Overlay'

type State = {
  columns?: {
    id: ColumnID
    title?: string
    text?: string
    cards?: {
      id: CardID
      text?: string
    }[]
  }[]
  cardsOrder: Record<string, CardID | ColumnID | null>
}

export const App = () => {
  const dispatch = useDispatch()
  const filterValue = useSelector((state) => state.filterValue)
  const setFilterValue = (value: string) => {
    dispatch({
      type: 'Filter.SetFilter',
      payload: {
        value,
      },
    })
  }

  const draggingCardID = useSelector((state) => state.draggingCardID)
  const columns = useSelector((state) => state.columns)
  const cardsOrder = useSelector((state) => state.cardsOrder)
  // TODO ビルドを通すためだけのスタブ実装なので、ちゃんとしたものにする
  const setData = (fn) => fn({ cardsOrder: {} })

  const setDraggingCardID = (cardID: CardID) => {
    dispatch({
      type: 'Card.SetDeletingCard.StartDragging',
      payload: {
        cardID,
      },
    })
  }

  const cardIsBeingDeleted = useSelector((state) =>
    Boolean(state.deletingCardID),
  )
  const setDeletingCardID = (cardID: CardID) =>
    dispatch({
      type: 'Card.SetDeletingCard',
      payload: {
        cardID,
      },
    })
  const cancelDelete = () =>
    dispatch({
      type: 'Dialog.CancelDelete',
    })

  //columns cards cardsOrderを取得
  useEffect(() => {
    ;(async () => {
      //columnsを取得しセットする
      const columns = await api('GET /v1/columns', null)
      dispatch({
        type: 'App.SetColumns',
        payload: {
          columns,
        },
      })
      //カード一覧      //カードの並び替え  //複数の非同期処理を全て実行する 配列で記述
      const [unorderedCards, cardsOrder] = await Promise.all([
        api('GET /v1/cards', null),
        api('GET /v1/cardsOrder', null),
      ])
      dispatch({
        type: 'App.SetCards',
        payload: {
          cards: unorderedCards,
          cardsOrder,
        },
      })
    })()
  }, [dispatch])

  const dropCardTo = (toID: CardID | ColumnID) => {
    const cardID = draggingCardID
    if (!cardID) return
    if (cardID === toID) return

    const patch = reorderPatch(cardsOrder, cardID, toID)
    //columnsの型を定義
    dispatch({
      type: 'Card.SetDeletingCard.Drop',
      payload: {
        toID,
      },
    })
    api('PATCH /v1/cardsOrder', patch)
  }

  //入力データをセットする
  const setText = (columnID: ColumnID, value: string) => {
    setData(
      produce((draft: State) => {
        const column = draft.columns?.find((c) => c.id === columnID)
        if (!column) return
        column.text = value
      }),
    )
  }
  //カードCreate
  const addCard = (columnID: ColumnID) => {
    const column = columns?.find((c) => c.id === columnID)
    if (!column) return

    const text = column.text
    const cardID = randomID() as CardID
    const patch = reorderPatch(cardsOrder, cardID, cardsOrder[columnID])
    setData(
      produce((draft: State) => {
        const column = draft.columns?.find((c) => c.id === columnID)
        if (!column?.cards) return
        //作成したカードを先頭に配置
        column.cards.unshift({
          id: cardID,
          text: column.text,
        })
        //カード作成後入力したテキストを消す
        column.text = ''

        draft.cardsOrder = {
          ...draft.cardsOrder,
          ...patch,
        }
      }),
    )
    api('POST /v1/cards', {
      id: cardID,
      text,
    })
    api('PATCH /v1/cardsOrder', patch)
  }

  return (
    <Container>
      <Header filterValue={filterValue} onFilterChange={setFilterValue} />

      <MainArea>
        <HorizontalScroll>
          {!columns ? (
            <Loading />
          ) : (
            columns.map(({ id: columnID, title, cards, text }) => (
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
            ))
          )}
        </HorizontalScroll>
      </MainArea>
      {cardIsBeingDeleted && (
        <Overlay onClick={cancelDelete}>
          <DeleteDialog />
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

const Loading = styled.div.attrs({
  children: 'Loading...',
})`
  font-size: 14px;
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
