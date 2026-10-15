import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { THEME } from '../theme/colors';

interface JsonTreeProps {
  data: unknown;
  name?: string;
  depth?: number;
  isLast?: boolean;
  initiallyExpanded?: boolean;
}

export const JsonTree: React.FC<JsonTreeProps> = ({
  data,
  name,
  depth = 0,
  isLast = true,
  initiallyExpanded = depth < 2,
}) => {
  const [expanded, setExpanded] = useState<boolean>(initiallyExpanded);
  const indentStyle = { paddingLeft: depth * 12 };

  if (data === null) {
    return (
      <View style={[styles.row, indentStyle]}>
        {name !== undefined && <Text style={styles.key}>"{name}": </Text>}
        <Text style={styles.nullVal}>null</Text>
        {!isLast && <Text style={styles.punctuation}>,</Text>}
      </View>
    );
  }

  if (data === undefined) {
    return (
      <View style={[styles.row, indentStyle]}>
        {name !== undefined && <Text style={styles.key}>"{name}": </Text>}
        <Text style={styles.undefinedVal}>undefined</Text>
        {!isLast && <Text style={styles.punctuation}>,</Text>}
      </View>
    );
  }

  const type = typeof data;

  if (type === 'string') {
    return (
      <View style={[styles.row, indentStyle]}>
        {name !== undefined && <Text style={styles.key}>"{name}": </Text>}
        <Text style={styles.stringVal}>"{String(data)}"</Text>
        {!isLast && <Text style={styles.punctuation}>,</Text>}
      </View>
    );
  }

  if (type === 'number') {
    return (
      <View style={[styles.row, indentStyle]}>
        {name !== undefined && <Text style={styles.key}>"{name}": </Text>}
        <Text style={styles.numberVal}>{String(data)}</Text>
        {!isLast && <Text style={styles.punctuation}>,</Text>}
      </View>
    );
  }

  if (type === 'boolean') {
    return (
      <View style={[styles.row, indentStyle]}>
        {name !== undefined && <Text style={styles.key}>"{name}": </Text>}
        <Text style={styles.boolVal}>{String(data)}</Text>
        {!isLast && <Text style={styles.punctuation}>,</Text>}
      </View>
    );
  }

  if (type === 'function') {
    return (
      <View style={[styles.row, indentStyle]}>
        {name !== undefined && <Text style={styles.key}>"{name}": </Text>}
        <Text style={styles.fnVal}>ƒ()</Text>
      </View>
    );
  }

  if (Array.isArray(data)) {
    const isEmpty = data.length === 0;
    return (
      <View style={indentStyle}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => !isEmpty && setExpanded(!expanded)}
          style={styles.clickableRow}
        >
          <Text style={styles.caret}>{isEmpty ? '  ' : expanded ? '▼ ' : '▶ '}</Text>
          {name !== undefined && <Text style={styles.key}>"{name}": </Text>}
          <Text style={styles.punctuation}>[</Text>
          {!expanded && (
            <Text style={styles.summary}>
              ... {data.length} {data.length === 1 ? 'item' : 'items'}
            </Text>
          )}
          {(!expanded || isEmpty) && (
            <>
              <Text style={styles.punctuation}>]</Text>
              {!isLast && <Text style={styles.punctuation}>,</Text>}
            </>
          )}
        </TouchableOpacity>

        {expanded && !isEmpty && (
          <View>
            {data.map((item, index) => (
              <JsonTree
                key={index}
                data={item}
                name={String(index)}
                depth={depth + 1}
                isLast={index === data.length - 1}
                initiallyExpanded={depth < 1}
              />
            ))}
            <View style={indentStyle}>
              <Text style={styles.punctuation}>
                ]{!isLast ? ',' : ''}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  if (type === 'object') {
    const keys = Object.keys(data as Record<string, unknown>);
    const isEmpty = keys.length === 0;

    return (
      <View style={indentStyle}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => !isEmpty && setExpanded(!expanded)}
          style={styles.clickableRow}
        >
          <Text style={styles.caret}>{isEmpty ? '  ' : expanded ? '▼ ' : '▶ '}</Text>
          {name !== undefined && <Text style={styles.key}>"{name}": </Text>}
          <Text style={styles.punctuation}>{'{'}</Text>
          {!expanded && (
            <Text style={styles.summary}>
              ... {keys.length} {keys.length === 1 ? 'key' : 'keys'}
            </Text>
          )}
          {(!expanded || isEmpty) && (
            <>
              <Text style={styles.punctuation}>{'}'}</Text>
              {!isLast && <Text style={styles.punctuation}>,</Text>}
            </>
          )}
        </TouchableOpacity>

        {expanded && !isEmpty && (
          <View>
            {keys.map((key, index) => (
              <JsonTree
                key={key}
                data={(data as Record<string, unknown>)[key]}
                name={key}
                depth={depth + 1}
                isLast={index === keys.length - 1}
                initiallyExpanded={depth < 1}
              />
            ))}
            <View style={indentStyle}>
              <Text style={styles.punctuation}>
                {'}'}{!isLast ? ',' : ''}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.row, indentStyle]}>
      <Text style={styles.textDim}>{String(data)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: 1,
  },
  clickableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
  },
  caret: {
    color: '#64748b',
    fontSize: 10,
    width: 14,
  },
  key: {
    color: THEME.colors.sky,
    fontFamily: 'Courier',
    fontSize: 12,
  },
  stringVal: {
    color: '#34d399',
    fontFamily: 'Courier',
    fontSize: 12,
  },
  numberVal: {
    color: '#f472b6',
    fontFamily: 'Courier',
    fontSize: 12,
  },
  boolVal: {
    color: '#fbbf24',
    fontFamily: 'Courier',
    fontSize: 12,
  },
  nullVal: {
    color: '#94a3b8',
    fontStyle: 'italic',
    fontFamily: 'Courier',
    fontSize: 12,
  },
  undefinedVal: {
    color: '#64748b',
    fontStyle: 'italic',
    fontFamily: 'Courier',
    fontSize: 12,
  },
  fnVal: {
    color: '#a78bfa',
    fontStyle: 'italic',
    fontSize: 12,
  },
  punctuation: {
    color: '#94a3b8',
    fontFamily: 'Courier',
    fontSize: 12,
  },
  summary: {
    color: '#64748b',
    fontStyle: 'italic',
    fontSize: 11,
    marginHorizontal: 4,
  },
  textDim: {
    color: '#94a3b8',
    fontSize: 12,
  },
});
