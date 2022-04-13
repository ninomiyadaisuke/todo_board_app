import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import styled from 'styled-components'
import * as color from './color'
import { Card } from './Card'
import { PlusIcon } from './icon'
import { InputForm as _InputForm } from './InputForm'
import { CardID, ColumnID } from './api'

export const Column = ({
  id: columnID,
  title,
  cards: rawCards,
}: // onTextCancel,
{
  title?: string
  cards?: {
    title?: string
    id: CardID
    text?: string
  }[]
  id: ColumnID
  // onTextCancel(): void
}) => {
  const filterValue = useSelector((state) => state.filterValue.trim())
  const keywords = filterValue.toLocaleLowerCase().split(/\s+/g) ?? []
  const cards = rawCards?.filter(({ text }) =>
    keywords?.every((w) => text?.toLocaleLowerCase().includes(w)),
  )
  const totalCount = rawCards?.length as number
  const [inputMode, setInputMode] = useState(false)
  const toggleInput = () => setInputMode((v) => !v)
  const cancelInput = () => {
    setInputMode(false)
    // onTextCancel?.()
  }

  const draggingCardID = useSelector((state) => state.deletingCardID)

  return (
    <Container>
      <Header>
        {totalCount >= 0 && <CountBadge>{totalCount}</CountBadge>}

        <ColumnName>{title}</ColumnName>

        <AddButton onClick={toggleInput} />
      </Header>
      {inputMode && <InputForm onCancel={cancelInput} columnID={columnID} />}

      {!cards ? (
        <Loading />
      ) : (
        <>
          {filterValue && <ResultCount>{cards.length} results</ResultCount>}
          <VerticalScroll>
            {cards.map(({ id }, i) => {
              return (
                <Card.DropArea
                  key={id}
                  targetID={id}
                  disabled={
                    draggingCardID !== undefined &&
                    (id === draggingCardID ||
                      cards[i - 1]?.id === draggingCardID)
                  }
                >
                  <Card id={id} />
                </Card.DropArea>
              )
            })}
            {/* カードを末尾に持っていく */}
            <Card.DropArea
              targetID={columnID}
              style={{ height: '100%' }}
              disabled={
                draggingCardID !== undefined &&
                cards[cards.length - 1]?.id === draggingCardID
              }
            />
          </VerticalScroll>
        </>
      )}
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-flow: column;
  width: 355px;
  height: 100%;
  border: solid 1px ${color.Silver};
  border-radius: 6px;
  background-color: ${color.LightSilver};

  > :not(:last-child) {
    flex-shrink: 0;
  }
`

const Header = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 8px;
`

const CountBadge = styled.div`
  margin-right: 8px;
  border-radius: 20px;
  padding: 2px 6px;
  color: ${color.Black};
  background-color: ${color.Silver};
  font-size: 12px;
  line-height: 1;
`

const ColumnName = styled.div`
  color: ${color.Black};
  font-size: 14px;
  font-weight: bold;
`

const AddButton = styled.button.attrs({
  type: 'button',
  children: <PlusIcon />,
})`
  margin-left: auto;
  color: ${color.Black};

  :hover {
    color: ${color.Blue};
  }
`

const InputForm = styled(_InputForm)`
  padding: 8px;
`

const Loading = styled.div.attrs({
  children: 'Loading...',
})`
  padding: 8px;
  font-size: 14px;
`

const ResultCount = styled.div`
  color: ${color.Black};
  font-size: 12px;
  text-align: center;
`

const VerticalScroll = styled.div`
  height: 100%;
  padding: 8px;
  overflow-y: auto;
  flex: 1 1 auto;

  > :not(:first-child) {
    margin-top: 8px;
  }
`
